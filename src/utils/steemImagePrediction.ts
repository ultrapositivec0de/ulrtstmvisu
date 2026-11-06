/**
 * Steem Image Prediction & Fallback Verification Module
 * 
 * SteemitImages uses an IPFS-style Base58 Multihash (sha2-256) prefixed with 'D'
 * to store uploaded media on S3/CDN:
 * https://cdn.steemitimages.com/DQm.../filename.ext
 * 
 * In Steemit's ImageHoster backend (upload.ts):
 * imageHash = sha256("ImageSigningChallenge" + fileData)
 * contentHash = 'D' + base58(multihash.encode(imageHash, 'sha2-256'))
 * url = https://cdn.steemitimages.com/${contentHash}/${filename}
 * 
 * If a browser CORS restriction blocks reading the response body (Status 200 with missing
 * Access-Control-Allow-Origin header), this module deterministically predicts the exact candidate URLs
 * and actively probes them via DOM Image elements (which are exempt from CORS read blocking)
 * to confirm that the image is actually available on the server before adding to the gallery.
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const IMAGE_CHALLENGE_PREFIX = 'ImageSigningChallenge';

export function base58Encode(buffer: Uint8Array): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
  return digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join('');
}

/**
 * Computes the deterministic Steem image keys from file binary data:
 * 1. Server exact algorithm: sha256("ImageSigningChallenge" + fileData) -> multihash -> base58 -> 'D' prefix
 * 2. Secondary raw fallback: sha256(fileData) -> multihash -> base58 -> 'D' prefix
 */
export async function computeSteemImageKeys(file: File | Blob): Promise<{
  serverKeyWithD: string;
  serverKeyWithoutD: string;
  rawKeyWithD: string;
  rawKeyWithoutD: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // 1. Primary Exact Server Algorithm (ImageHoster upload.ts):
  // sha256("ImageSigningChallenge" + fileBytes)
  const prefix = new TextEncoder().encode(IMAGE_CHALLENGE_PREFIX);
  const combined = new Uint8Array(prefix.length + fileBytes.length);
  combined.set(prefix, 0);
  combined.set(fileBytes, prefix.length);

  const serverHashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const serverHashBytes = new Uint8Array(serverHashBuffer);

  const serverMhBytes = new Uint8Array(2 + serverHashBytes.length);
  serverMhBytes[0] = 0x12; // sha2-256 multihash code
  serverMhBytes[1] = 0x20; // 32-byte digest length
  serverMhBytes.set(serverHashBytes, 2);

  const serverBase58 = base58Encode(serverMhBytes);

  // 2. Secondary Raw Fallback: sha256(fileBytes) without challenge prefix
  const rawHashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const rawHashBytes = new Uint8Array(rawHashBuffer);

  const rawMhBytes = new Uint8Array(2 + rawHashBytes.length);
  rawMhBytes[0] = 0x12;
  rawMhBytes[1] = 0x20;
  rawMhBytes.set(rawHashBytes, 2);

  const rawBase58 = base58Encode(rawMhBytes);

  return {
    serverKeyWithD: 'D' + serverBase58,
    serverKeyWithoutD: serverBase58,
    rawKeyWithD: 'D' + rawBase58,
    rawKeyWithoutD: rawBase58,
  };
}

/**
 * Sanitizes a filename for URL candidates matching SteemitImages server convention
 */
export function sanitizeImageFilename(name: string): string {
  if (!name) return 'image.png';
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const base = parts.join('.');
  const cleanBase = base
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')
    .substring(0, 40);
  return cleanBase + (ext ? '.' + ext : '');
}

/**
 * Builds candidate URLs ordered by priority (CDN first, with 'D' prefix and with/without filename)
 */
export async function getPredictedSteemImageUrls(
  file: File | Blob,
  customFileName?: string,
): Promise<string[]> {
  const keys = await computeSteemImageKeys(file);
  const rawName = customFileName || (file instanceof File ? file.name : 'image.png');
  const cleanName = sanitizeImageFilename(rawName);
  const encodedRaw = encodeURIComponent(rawName);
  const encodedClean = encodeURIComponent(cleanName);

  // Server exact format is: D + base58(multihash(sha256("ImageSigningChallenge" + data)))
  const orderedKeys = [
    keys.serverKeyWithD,
    keys.serverKeyWithoutD,
    keys.rawKeyWithD,
    keys.rawKeyWithoutD,
  ];

  const candidateUrls: string[] = [];
  for (const k of orderedKeys) {
    candidateUrls.push(`https://cdn.steemitimages.com/${k}/${encodedClean}`);
    candidateUrls.push(`https://cdn.steemitimages.com/${k}/${encodedRaw}`);
    candidateUrls.push(`https://cdn.steemitimages.com/${k}/${rawName}`);
    candidateUrls.push(`https://cdn.steemitimages.com/${k}`);
    candidateUrls.push(`https://steemitimages.com/${k}/${encodedClean}`);
    candidateUrls.push(`https://steemitimages.com/${k}/${encodedRaw}`);
    candidateUrls.push(`https://steemitimages.com/${k}`);
  }

  return Array.from(new Set(candidateUrls));
}

/**
 * Probes an image URL using the DOM Image object.
 * Images loaded into <img /> or new Image() are NOT subject to CORS blocking!
 * If the server has the image, onload fires and returns true.
 */
export function verifyImageUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    const img = new Image();
    let isSettled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      isSettled = true;
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    timer = setTimeout(() => {
      if (!isSettled) {
        cleanup();
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!isSettled) {
        cleanup();
        resolve(img.naturalWidth > 0);
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        cleanup();
        resolve(false);
      }
    };

    img.src = url;
  });
}

/**
 * Asynchronously searches for the first working predicted URL with retries
 * (allowing cloud processing / S3 propagation delay).
 */
export async function findWorkingPredictedImageUrl(
  file: File | Blob,
  customFileName?: string,
  maxAttempts = 5,
  delayBetweenAttemptsMs = 1200,
): Promise<string | null> {
  const candidateUrls = await getPredictedSteemImageUrls(file, customFileName);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const url of candidateUrls) {
      const isWorking = await verifyImageUrl(url, 3000);
      if (isWorking) {
        return url;
      }
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayBetweenAttemptsMs));
    }
  }

  return null;
}
