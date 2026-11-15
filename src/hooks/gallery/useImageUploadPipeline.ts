import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import ExifReader from 'exifreader';
import { Buffer } from 'buffer';
import { SecurityService } from '../../services/securityService';
import { NativeHttpService } from '../../services/nativeHttpService';
import { findWorkingPredictedImageUrl } from '../../utils/steemImagePrediction';
import { ImageItem, AuthType } from '../../types';

export const sanitizeFilename = (name: string): string => {
  const ukrToLatin: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
    'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ь': '', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
    'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
  };

  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const base = parts.join('.');
  const result = base.split('').map(char => ukrToLatin[char] || char).join('');

  return result
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')
    .substring(0, 40) + (ext ? '.' + ext : '');
};

export interface UseImageUploadPipelineConfig {
  t: (key: any) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  setActiveModal: (modal: string | null) => void;
  initVault: () => Promise<void>;
  setPubLog: Dispatch<SetStateAction<{ msg: string; type: 'success' | 'error' | 'loading' | null }>>;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  selectedVaultUser: string;
  vaultAccounts: string[];
  setIsMiniGalleryOpen: Dispatch<SetStateAction<boolean>>;
  authType?: AuthType | 'VAULT';
  setImages: Dispatch<SetStateAction<ImageItem[]>>;
  setSourceInput: Dispatch<SetStateAction<string>>;
  insertImage: (url: string, name: string, position: 'left' | 'right' | 'center' | 'plain') => void;
}

export function useImageUploadPipeline({
  t,
  notify,
  promptDialog,
  setActiveModal,
  initVault,
  setPubLog,
  username,
  setUsername,
  selectedVaultUser,
  vaultAccounts,
  setIsMiniGalleryOpen,
  authType,
  setImages,
  setSourceInput,
  insertImage,
}: UseImageUploadPipelineConfig) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploadAccount, setImageUploadAccount] = useState('');
  const [isExifEnabled, setIsExifEnabled] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('steem_exif_enabled') === 'true';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_exif_enabled', String(isExifEnabled));
    }
  }, [isExifEnabled]);

  useEffect(() => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    if (!hasKeychain && vaultAccounts.length > 0) {
      if (!imageUploadAccount || !vaultAccounts.includes(imageUploadAccount)) {
        setImageUploadAccount(selectedVaultUser || vaultAccounts[0]);
      }
    }
  }, [vaultAccounts, selectedVaultUser, imageUploadAccount]);

  const getExifTableFromBlob = useCallback(async (file: File | Blob): Promise<string> => {
    if (!isExifEnabled) return '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      if (!tags) return '';

      const make = tags['Make']?.description || '';
      const model = tags['Model']?.description || '';
      const fNumber = tags['FNumber']?.description ? `f/${tags['FNumber'].description}` : '';
      const iso = tags['ISOSpeedRatings']?.description ? `ISO ${tags['ISOSpeedRatings'].description}` : '';
      const shutter = tags['ExposureTime']?.description || '';
      const focal = tags['FocalLength']?.description || '';

      if (!make && !model && !iso) return '';

      let table = '\n| Param | Camera Info |\n| --- | --- |\n';
      if (make || model) table += `| 📸 | ${make} ${model} |\n`;
      if (fNumber) table += `| 🔘 | ${fNumber} |\n`;
      if (shutter) table += `| ⏲️ | ${shutter} |\n`;
      if (iso) table += `| 🎞️ | ${iso} |\n`;
      if (focal) table += `| 🔍 | ${focal} |\n`;

      return table + '\n';
    } catch (e) {
      console.error('Exif error:', e);
      return '';
    }
  }, [isExifEnabled]);

  const uploadExternalImage = useCallback(async (url: string, fileName: string = 'image.jpg') => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount
      ? 'VAULT'
      : (authType === 'VAULT' ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT'));
    let activeUser = imageUploadAccount;

    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        activeUser = selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');
      } else {
        activeUser = username;
      }
    }

    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '').trim();
        setUsername(activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await promptDialog(
          pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) return;
        try {
          setPubLog({ msg: t('verifyingPinMsg'), type: 'loading' });
          await SecurityService.unlock(pass);
          await initVault();
          unlocked = true;
          setPubLog({ msg: '', type: null });
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    setPubLog({ msg: t('preparingUpload').replace('{name}', fileName), type: 'loading' });

    try {
      let blob: Blob;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        blob = await res.blob();
      } catch {
        setPubLog({ msg: t('proxyAttempt'), type: 'loading' });
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(t('proxyError'));
        blob = await res.blob();
      }

      const file = new File([blob], fileName, { type: blob.type });
      const cleanUser = (activeUser || '').replace(/^@+/, '').trim();
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, cleanUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(file, cleanUser);
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `https://steemitimages.com/${cleanUser}/${signature}`;
      let finalUrl = '';

      // 1. Try Native HTTP if in Tauri, Neutralino, or Android
      if (NativeHttpService.isNativeEnvironment()) {
        const nativeRes = await NativeHttpService.tryUpload(file, uploadUrl, fileName);
        if (nativeRes.handled && nativeRes.success && nativeRes.url) {
          finalUrl = nativeRes.url;
        }
      }

      // 2. Direct Web fetch (if not already handled natively)
      if (!finalUrl) {
        try {
          const response = await fetch(uploadUrl, { method: "POST", body: formData });
          if (response.ok) {
            try {
              const data = await response.json();
              finalUrl = data.url || data.link || data.data?.url || '';
            } catch {
              // CORS blocked response JSON reading
            }
          }
        } catch {
          // Direct fetch failed; issue no-cors POST to deliver payload to server
          try {
            await fetch(uploadUrl, { method: "POST", body: formData, mode: "no-cors" });
          } catch {
            // ignore transport errors
          }
        }
      }

      // 3. Deterministic DOM Image probing (exempt from CORS read blocking)
      if (!finalUrl) {
        setPubLog({ msg: t('verifyingImage'), type: 'loading' });
        const predicted = await findWorkingPredictedImageUrl(file, fileName);
        if (predicted) {
          finalUrl = predicted;
        }
      }

      if (finalUrl) {
        const newImg: ImageItem = { url: finalUrl, name: fileName, selected: false };
        setImages(prev => [newImg, ...prev]);
        setSourceInput(prev => finalUrl + "\n" + prev);
      } else {
        throw new Error('Image upload could not be verified on server');
      }
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  }, [imageUploadAccount, authType, selectedVaultUser, vaultAccounts, username, notify, t, setActiveModal, promptDialog, setUsername, initVault, setPubLog, setImages, setSourceInput]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    if (isUploading) {
      if (inputEl) inputEl.value = '';
      return;
    }

    const rawFiles = inputEl?.files;
    if (!rawFiles || rawFiles.length === 0) {
      if (inputEl) inputEl.value = '';
      return;
    }
    const files = Array.from(rawFiles);

    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount
      ? 'VAULT'
      : (authType === 'VAULT' ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT'));
    let activeUser = imageUploadAccount;

    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        activeUser = selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');
      } else {
        activeUser = username;
      }
    }

    if (!activeUser) {
      if (inputEl) inputEl.value = '';
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '').trim();
        setUsername(activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await promptDialog(
          pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) {
          if (inputEl) inputEl.value = '';
          return;
        }
        try {
          setPubLog({ msg: t('verifyingPinMsg'), type: 'loading' });
          await SecurityService.unlock(pass);
          await initVault();
          unlocked = true;
          setPubLog({ msg: '', type: null });
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        if (inputEl) inputEl.value = '';
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;

    const uploadVaultWithProgress = async (file: File, signature: string, user: string, index: number): Promise<any> => {
      const uploadUrl = `https://steemitimages.com/${user}/${signature}`;

      // 1. Try Native HTTP if in Tauri, Neutralino, or Android
      if (NativeHttpService.isNativeEnvironment()) {
        const nativeRes = await NativeHttpService.tryUpload(file, uploadUrl, file.name);
        if (nativeRes.handled && nativeRes.success && nativeRes.url) {
          return { url: nativeRes.url };
        }
      }

      // 2. Direct Web XHR with progress
      return new Promise((resolve, reject) => {
        let isSettled = false;
        const safeReject = (err: Error) => {
          if (!isSettled) {
            isSettled = true;
            reject(err);
          }
        };
        const safeResolve = (val: any) => {
          if (!isSettled) {
            isSettled = true;
            resolve(val);
          }
        };

        const formData = new FormData();
        formData.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const percent = Math.round((ev.loaded / ev.total) * 100);
            setPubLog({
              msg: t('uploadProgress')
                .replace('{current}', (index + 1).toString())
                .replace('{total}', files.length.toString())
                .replace('{name}', `${file.name} (${percent}%)`),
              type: 'loading',
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText);
              if (parsed.success === false || parsed.error) {
                const errMsg = parsed.error?.message || parsed.error?.name || parsed.message || (typeof parsed.error === 'string' ? parsed.error : 'Image host rejected signature');
                safeReject(new Error(`${t('serverError')}: ${errMsg}`));
                return;
              }
              safeResolve(parsed);
            } catch {
              safeReject(new Error(`Invalid JSON response: ${xhr.responseText ? xhr.responseText.substring(0, 100) : 'empty'}`));
            }
          } else {
            let errorDetail: string;
            try {
              const errParsed = JSON.parse(xhr.responseText);
              errorDetail = errParsed.error?.message || errParsed.error?.name || errParsed.message || (typeof errParsed.error === 'string' ? errParsed.error : '');
            } catch {
              errorDetail = xhr.responseText ? xhr.responseText.substring(0, 100) : '';
            }
            safeReject(new Error(`${t('serverError')}: ${xhr.status}${errorDetail ? ` (${errorDetail})` : ''}`));
          }
        };
        xhr.onerror = async () => {
          // If browser blocked XHR response due to missing CORS headers, attempt no-cors + DOM Image probe
          try {
            await fetch(uploadUrl, { method: "POST", body: formData, mode: "no-cors" });
            const predicted = await findWorkingPredictedImageUrl(file, file.name);
            if (predicted) {
              safeResolve({ url: predicted });
              return;
            }
          } catch {
            // ignore
          }
          safeReject(new Error("Network connection error"));
        };
        xhr.onabort = () => safeReject(new Error("Upload aborted"));
        xhr.ontimeout = () => safeReject(new Error("Upload timed out (60s)"));
        xhr.timeout = 60000;
        xhr.send(formData);
      });
    };

    try {
      const cleanUser = (activeUser || '').replace(/^@+/, '').trim();
      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];
        const sanitizedName = sanitizeFilename(originalFile.name);
        const file = new File([originalFile], sanitizedName, { type: originalFile.type });

        if (i > 0) await new Promise(resolve => setTimeout(resolve, 400));

        try {
          const exifTable = await getExifTableFromBlob(originalFile);

          let signature = '';
          if (uploadAuthType === 'VAULT') {
            const arrayBuffer = await file.arrayBuffer();
            const fileBuffer = Buffer.from(arrayBuffer);
            const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
            const dataToSign = Buffer.concat([prefix, fileBuffer]);

            let attempt = 0;
            let uploaded = false;
            let lastErr: any = null;
            while (attempt < 3 && !uploaded) {
              attempt++;
              try {
                setPubLog({
                  msg: `[${i + 1}/${files.length}] ` + t('signingImage').replace('{name}', file.name) + (attempt > 1 ? t('signingImageAttempt').replace('{attempt}', attempt.toString()) : ''),
                  type: 'loading',
                });
                signature = await SecurityService.signBuffer(dataToSign, cleanUser);
                const data = await uploadVaultWithProgress(file, signature, cleanUser, i);
                const url = data.url || data.link || data.data?.url;
                if (url) {
                  setImages(prev => [
                    ...prev.slice(0, i),
                    { url, name: file.name, selected: false, exif: exifTable },
                    ...prev.slice(i)
                  ]);
                  setSourceInput(prev => url + "\n" + prev);
                  successCount++;
                  uploaded = true;
                  if (i === 0) {
                    insertImage(url, file.name, 'plain');
                  }
                } else {
                  const errMsg = data.error?.message || data.error?.name || data.message || (typeof data.error === 'string' ? data.error : 'No URL returned from image host');
                  throw new Error(errMsg);
                }
              } catch (err: any) {
                lastErr = err;
                console.warn(`Upload attempt ${attempt} failed for ${file.name}:`, err);
                if (attempt >= 3) throw lastErr;
                setPubLog({
                  msg: t('uploadRetryAttempt')
                    .replace('{attempt}', attempt.toString())
                    .replace('{error}', err.message || t('error'))
                    .replace('{seconds}', (attempt * 1.5).toString()),
                  type: 'loading',
                });
                await new Promise(r => setTimeout(r, 1500 * attempt));
              }
            }
          } else {
            setPubLog({
              msg: `[${i + 1}/${files.length}] ` + t('uploadProgress').replace('{current}', (i + 1).toString()).replace('{total}', files.length.toString()).replace('{name}', file.name),
              type: 'loading',
            });

            signature = await SecurityService.signImageChallengeWithKeychain(file, cleanUser);

            const formData = new FormData();
            formData.append("file", file);
            const uploadEndpoint = `https://steemitimages.com/${cleanUser}/${signature}`;
            let url = '';

            // 1. Try Native HTTP if in Tauri, Neutralino, or Android
            if (NativeHttpService.isNativeEnvironment()) {
              const nativeRes = await NativeHttpService.tryUpload(file, uploadEndpoint, file.name);
              if (nativeRes.handled && nativeRes.success && nativeRes.url) {
                url = nativeRes.url;
              }
            }

            if (!url) {
              try {
                const resp = await fetch(uploadEndpoint, { method: "POST", body: formData });
                if (resp.ok) {
                  try {
                    const data = await resp.json();
                    url = data.url || data.link || data.data?.url || '';
                  } catch {
                    // Browser CORS blocked response JSON reading
                  }
                }
              } catch {
                // Direct CORS fetch failed; issue no-cors POST so browser transmits file payload to server
                try {
                  await fetch(uploadEndpoint, { method: "POST", body: formData, mode: "no-cors" });
                } catch {
                  // Ignore no-cors transport errors
                }
              }
            }

            // Probe predicted candidate URLs using non-CORS Image DOM elements
            if (!url) {
              setPubLog({
                msg: `[${i + 1}/${files.length}] ` + t('verifyingImage'),
                type: 'loading',
              });
              const predicted = await findWorkingPredictedImageUrl(file, file.name);
              if (predicted) {
                url = predicted;
              }
            }

            if (url) {
              setImages(prev => [
                ...prev.slice(0, i),
                { url, name: file.name, selected: false, exif: exifTable },
                ...prev.slice(i)
              ]);
              setSourceInput(prev => url + "\n" + prev);
              successCount++;
              if (i === 0) {
                insertImage(url, file.name, 'plain');
              }
            } else {
              throw new Error('Image could not be verified on server');
            }
          }
        } catch (err: any) {
          console.error(`Error uploading file ${file.name}:`, err);
          setPubLog({
            msg: t('fileErrorWithIndex')
              .replace('{index}', (i + 1).toString())
              .replace('{name}', file.name)
              .replace('{error}', err.message),
            type: 'error',
          });
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    } finally {
      if (inputEl) inputEl.value = '';
      setIsUploading(false);
      if (successCount > 0) {
        setPubLog({
          msg: t('uploadComplete').replace('{count}', successCount.toString()).replace('{total}', files.length.toString()),
          type: 'success',
        });
        setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
        if (files.length > 1) {
          setIsMiniGalleryOpen(true);
        }
      } else {
        setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
      }
    }
  }, [isUploading, imageUploadAccount, authType, selectedVaultUser, vaultAccounts, username, notify, t, setActiveModal, promptDialog, setUsername, initVault, setPubLog, getExifTableFromBlob, setImages, setSourceInput, insertImage, setIsMiniGalleryOpen]);

  return {
    isUploading,
    setIsUploading,
    imageUploadAccount,
    setImageUploadAccount,
    isExifEnabled,
    setIsExifEnabled,
    getExifTableFromBlob,
    uploadExternalImage,
    handleFileUpload,
  };
}
