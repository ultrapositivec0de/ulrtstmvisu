import { Client, PrivateKey, cryptoUtils } from 'dsteem';

let currentPin: string | null = null;
let statusCallbacks: ((unlocked: boolean) => void)[] = [];

function notifyCallbacks() {
  const locked = isLocked();
  statusCallbacks.forEach(cb => {
    try {
      cb(!locked);
    } catch (e) {
      console.error("Callback error", e);
    }
  });
}

// Helper: derive crypto key from pin using PBKDF2
async function deriveKey(password: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt utility
async function encrypt(text: string, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const rawSalt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(rawSalt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const key = await deriveKey(pin, saltHex);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encodedText = enc.encode(text);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );
  
  const encryptedHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${ivHex}:${encryptedHex}`;
}

// Decrypt utility
async function decrypt(encryptedData: string, pin: string): Promise<string> {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [saltHex, ivHex, encryptedHex] = parts;
  
  const key = await deriveKey(pin, saltHex);
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encryptedBuffer = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedBuffer
  );
  
  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

export async function isInitialized(): Promise<boolean> {
  return localStorage.getItem('steem_vault_marker') !== null;
}

export function isLocked(): boolean {
  return currentPin === null;
}

export function lock(): void {
  currentPin = null;
  notifyCallbacks();
}

export function setStatusCallback(cb: (unlocked: boolean) => void): void {
  statusCallbacks.push(cb);
  // Initial fire
  try {
    cb(!isLocked());
  } catch (e) {}
}

export async function setup(pin: string): Promise<void> {
  const marker = await encrypt('ok', pin);
  localStorage.setItem('steem_vault_marker', marker);
  currentPin = pin;
  notifyCallbacks();
}

export async function unlock(pin: string): Promise<void> {
  const marker = localStorage.getItem('steem_vault_marker');
  if (!marker) throw new Error("Vault is not initialized");
  
  try {
    const dec = await decrypt(marker, pin);
    if (dec === 'ok') {
      currentPin = pin;
      notifyCallbacks();
    } else {
      throw new Error("Incorrect PIN");
    }
  } catch (e) {
    throw new Error("Incorrect PIN");
  }
}

export async function getAccounts(): Promise<{ username: string }[]> {
  const accountsData = localStorage.getItem('steem_vault_accounts');
  if (!accountsData) return [];
  try {
    const list = JSON.parse(accountsData);
    return list.map((a: any) => ({ username: a.username }));
  } catch (e) {
    return [];
  }
}

async function getDecryptedKey(username: string): Promise<string | null> {
  if (isLocked() || !currentPin) throw new Error("Vault is locked");
  const accountsData = localStorage.getItem('steem_vault_accounts');
  if (!accountsData) return null;
  try {
    const list = JSON.parse(accountsData);
    const acc = list.find((a: any) => a.username.toLowerCase() === username.toLowerCase());
    if (!acc) return null;
    return await decrypt(acc.encryptedWif, currentPin);
  } catch (e) {
    return null;
  }
}

export async function saveKey(username: string, wif: string): Promise<void> {
  if (isLocked() || !currentPin) throw new Error("Vault is locked");
  let accountsData = localStorage.getItem('steem_vault_accounts');
  let list: any[] = [];
  if (accountsData) {
    try {
      list = JSON.parse(accountsData);
    } catch (e) {}
  }
  
  const encryptedWif = await encrypt(wif, currentPin);
  
  // Remove existing
  list = list.filter((a: any) => a.username.toLowerCase() !== username.toLowerCase());
  list.push({ username, encryptedWif });
  
  localStorage.setItem('steem_vault_accounts', JSON.stringify(list));
}

export async function deleteAccount(username: string): Promise<void> {
  let accountsData = localStorage.getItem('steem_vault_accounts');
  if (!accountsData) return;
  try {
    let list = JSON.parse(accountsData);
    list = list.filter((a: any) => a.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem('steem_vault_accounts', JSON.stringify(list));
  } catch (e) {}
}

export async function clearAll(): Promise<void> {
  localStorage.removeItem('steem_vault_marker');
  localStorage.removeItem('steem_vault_accounts');
  localStorage.removeItem('steem_pexels_key');
  localStorage.removeItem('steem_api_key_pixabay');
  localStorage.removeItem('steem_api_key_unsplashAccess');
  lock();
}

export async function getPexelsKey(): Promise<string> {
  if (isLocked() || !currentPin) return '';
  const encrypted = localStorage.getItem('steem_pexels_key');
  if (!encrypted) return '';
  try {
    return await decrypt(encrypted, currentPin);
  } catch (e) {
    return '';
  }
}

export async function savePexelsKey(key: string): Promise<void> {
  if (isLocked() || !currentPin) throw new Error("Vault is locked");
  const encrypted = await encrypt(key, currentPin);
  localStorage.setItem('steem_pexels_key', encrypted);
}

export async function getApiKey(serviceName: string): Promise<string | null> {
  if (isLocked() || !currentPin) return null;
  const encrypted = localStorage.getItem(`steem_api_key_${serviceName}`);
  if (!encrypted) return null;
  try {
    return await decrypt(encrypted, currentPin);
  } catch (e) {
    return null;
  }
}

export async function saveApiKey(serviceName: string, key: string): Promise<void> {
  if (isLocked() || !currentPin) throw new Error("Vault is locked");
  const encrypted = await encrypt(key, currentPin);
  localStorage.setItem(`steem_api_key_${serviceName}`, encrypted);
}

export async function clearAllApiKeys(): Promise<void> {
  localStorage.removeItem('steem_pexels_key');
  localStorage.removeItem('steem_api_key_pixabay');
  localStorage.removeItem('steem_api_key_unsplashAccess');
}

export async function signBuffer(dataToSign: string | Buffer, activeUser: string): Promise<string> {
  const wif = await getDecryptedKey(activeUser);
  if (!wif) throw new Error(`Private key for user ${activeUser} not found in Vault.`);
  const privateKey = PrivateKey.fromString(wif);
  
  let bufferToHash: Buffer;
  if (Buffer.isBuffer(dataToSign)) {
    bufferToHash = dataToSign;
  } else {
    bufferToHash = Buffer.from(dataToSign, 'utf-8');
  }
  
  const hash = cryptoUtils.sha256(bufferToHash);
  return privateKey.sign(hash).toString();
}

export function signImageChallengeWithKeychain(file: File, username: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!(window as any).steem_keychain) {
      return reject(new Error("Steem Keychain is not installed."));
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const fileBuffer = Buffer.from(arrayBuffer);
      const hex = fileBuffer.toString('hex');
      
      (window as any).steem_keychain.requestSignBuffer(username, hex, 'Posting', (response: any) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.message || "Keychain signing failed"));
        }
      });
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export async function broadcastPost(client: Client, comment: any, author: string, options?: any): Promise<any> {
  const wif = await getDecryptedKey(author);
  if (!wif) throw new Error(`Private key for user ${author} not found in Vault.`);
  const privateKey = PrivateKey.fromString(wif);
  
  const operations: any[] = [
    ['comment', comment]
  ];
  
  if (options) {
    operations.push(['comment_options', options]);
  }
  
  return await client.broadcast.sendOperations(operations, privateKey);
}

export async function broadcastDeleteComment(client: Client, activeUser: string, permlink: string): Promise<any> {
  const wif = await getDecryptedKey(activeUser);
  if (!wif) throw new Error(`Private key for user ${activeUser} not found in Vault.`);
  const privateKey = PrivateKey.fromString(wif);
  
  const operations: any[] = [
    ['delete_comment', { author: activeUser, permlink }]
  ];
  
  return await client.broadcast.sendOperations(operations, privateKey);
}

export async function broadcastCustomJson(client: Client, params: any, activeUser: string): Promise<any> {
  const wif = await getDecryptedKey(activeUser);
  if (!wif) throw new Error(`Private key for user ${activeUser} not found in Vault.`);
  const privateKey = PrivateKey.fromString(wif);
  
  const operations: any[] = [
    ['custom_json', params]
  ];
  
  return await client.broadcast.sendOperations(operations, privateKey);
}

export async function broadcastVote(client: Client, vote: any, activeUser: string): Promise<any> {
  const wif = await getDecryptedKey(activeUser);
  if (!wif) throw new Error(`Private key for user ${activeUser} not found in Vault.`);
  const privateKey = PrivateKey.fromString(wif);
  
  const operations: any[] = [
    ['vote', vote]
  ];
  
  return await client.broadcast.sendOperations(operations, privateKey);
}

export const SecurityService = {
  isInitialized,
  isLocked,
  lock,
  setStatusCallback,
  setup,
  unlock,
  getAccounts,
  saveKey,
  deleteAccount,
  clearAll,
  getPexelsKey,
  savePexelsKey,
  getApiKey,
  saveApiKey,
  clearAllApiKeys,
  signBuffer,
  signImageChallengeWithKeychain,
  broadcastPost,
  broadcastDeleteComment,
  broadcastCustomJson,
  broadcastVote
};
