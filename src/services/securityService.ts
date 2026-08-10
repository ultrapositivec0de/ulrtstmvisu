import * as dsteem from '@blazeapps/dsteem';
import { Buffer } from 'buffer';
import { get, set, del } from 'idb-keyval';

// Storage keys
const STORAGE_KEY_ACCOUNTS = 'steem_vault_accounts_v3';
const STORAGE_KEY_WRAPPED_MK = 'steem_vault_wrapped_mk_v3';
const STORAGE_KEY_API_KEYS = 'steem_vault_api_keys_v3';
const PEXELS_KEY = '_px_meta_v1'; // legacy

// Static App Secret (Static Salt)
const APP_SECRET = "steem-editor-pro-v1-static-salt-2024";

const getDSteem = () => {
  return dsteem;
};

interface WrappedMasterKey {
  wrappedKey: string; // Base64
  salt: string;       // Base64
  iv: string;         // Base64
  marker: string;     // Base64 (Encrypted "VALID" string to verify PIN)
}

interface VaultAccount {
  username: string;
  ciphertext: string; // Encrypted with Master Key
  iv: string;         // IV for Master Key encryption
}

export class SecurityService {
  private static masterKey: CryptoKey | null = null;
  private static sessionTimer: any = null;
  private static onStatusChange: ((unlocked: boolean) => void) | null = null;
  private static unlockedUsername: string | null = null;

  /**
   * Первинне налаштування: генерація Master Key та захист його ПІН-кодом
   */
  static async setup(pin: string): Promise<void> {
    // 1. Генеруємо випадковий Master Key (AES-GCM 256)
    const masterKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // 2. Експортуємо MK у raw формат для шифрування
    const rawMK = await window.crypto.subtle.exportKey('raw', masterKey);

    // 3. Створюємо Wrapping Key з ПІН-коду
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // 4. Шифруємо Master Key за допомогою Wrapping Key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedMKBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrappingKey,
      rawMK
    );

    // 5. Створюємо маркер перевірки (шифруємо слово "VALID")
    const markerBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrappingKey,
      new TextEncoder().encode("VALID")
    );

    // 6. Зберігаємо все в IndexedDB
    const wrappedData: WrappedMasterKey = {
      wrappedKey: this.bufferToBase64(wrappedMKBuffer),
      salt: this.bufferToBase64(salt.buffer as ArrayBuffer),
      iv: this.bufferToBase64(iv.buffer as ArrayBuffer),
      marker: this.bufferToBase64(markerBuffer)
    };

    await set(STORAGE_KEY_WRAPPED_MK, wrappedData);
    
    // Автоматично розблоковуємо після налаштування
    this.masterKey = masterKey;
    if (this.onStatusChange) this.onStatusChange(true);
  }

  /**
   * Розблокування: отримання Master Key у пам'ять за допомогою ПІН-коду
   */
  static async unlock(pin: string, timeoutMs: number = 3600000): Promise<void> {
    const data = await get<WrappedMasterKey>(STORAGE_KEY_WRAPPED_MK);
    if (!data) throw new Error('Vault not configured. Please set a PIN first.');

    const salt = this.base64ToBuffer(data.salt);
    const iv = this.base64ToBuffer(data.iv);
    const wrappedKey = this.base64ToBuffer(data.wrappedKey);
    const marker = this.base64ToBuffer(data.marker);

    // 1. Derive Wrapping Key
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // 2. Verify PIN via marker
    try {
      const decryptedMarker = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as any },
        wrappingKey,
        marker as any
      );
      const markerText = new TextDecoder().decode(decryptedMarker);
      if (markerText !== "VALID") throw new Error("Invalid PIN");
    } catch (e) {
      throw new Error('Incorrect PIN', { cause: e });
    }

    // 3. Розшифрування Master Key
    const rawMK = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      wrappingKey,
      wrappedKey as any
    );

    this.masterKey = await window.crypto.subtle.importKey(
      'raw',
      rawMK,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Встановлюємо таймер автоблокування (1 година за замовчуванням)
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(() => this.lock(), timeoutMs);
    
    if (this.onStatusChange) this.onStatusChange(true);
  }

  /**
   * Закриття сесії
   */
  static lock(): void {
    this.masterKey = null;
    this.unlockedUsername = null;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.onStatusChange) this.onStatusChange(false);
  }

  static isLocked(): boolean {
    return this.masterKey === null;
  }

  static setStatusCallback(cb: (unlocked: boolean) => void) {
    this.onStatusChange = cb;
  }

  /**
   * Шифрування даних за допомогою Master Key
   */
  static async encryptData(data: string): Promise<{ ciphertext: string; iv: string }> {
    if (!this.masterKey) throw new Error('Vault is locked');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      new TextEncoder().encode(data)
    );

    return {
      ciphertext: this.bufferToBase64(encrypted),
      iv: this.bufferToBase64(iv.buffer as ArrayBuffer)
    };
  }

  /**
   * Дешифрування даних за допомогою Master Key
   */
  static async decryptData(ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (!this.masterKey) throw new Error('Vault is locked');

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.base64ToBuffer(ivBase64) as any },
      this.masterKey,
      this.base64ToBuffer(ciphertextBase64) as any
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Деривація Wrapping Key з ПІН-коду (PBKDF2)
   */
  private static async deriveWrappingKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    // Комбінуємо ПІН зі статичним секретом додатка
    const pinMaterial = encoder.encode(pin + APP_SECRET);
    
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      pinMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 600000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // --- Методи для роботи з акаунтами ---

  static async getAccounts(): Promise<VaultAccount[]> {
    const data = await get<VaultAccount[]>(STORAGE_KEY_ACCOUNTS);
    return data || [];
  }

  static async saveKey(username: string, wif: string): Promise<void> {
    if (this.isLocked()) throw new Error('Please enter PIN first');
    
    const { ciphertext, iv } = await this.encryptData(wif);
    const accounts = await this.getAccounts();
    
    const newAccount: VaultAccount = { username, ciphertext, iv };
    const existingIdx = accounts.findIndex(a => a.username === username);
    
    if (existingIdx >= 0) {
      accounts[existingIdx] = newAccount;
    } else {
      accounts.push(newAccount);
    }

    await set(STORAGE_KEY_ACCOUNTS, accounts);
  }

  static async deleteAccount(username: string): Promise<void> {
    const accounts = await this.getAccounts();
    const filtered = accounts.filter(a => a.username !== username);
    await set(STORAGE_KEY_ACCOUNTS, filtered);
  }

  static async broadcastCustomJson(client: any, customJson: any, username: string): Promise<any> {
    if (!this.masterKey) throw new Error('Vault is locked');
    
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.username === username);
    if (!account) throw new Error(`Account @${username} not found`);

    const wif = await this.decryptData(account.ciphertext, account.iv);
    
    try {
      const privateKey = getDSteem().PrivateKey.fromString(wif);
      
      if (client.broadcast.customJson) {
        return await client.broadcast.customJson(
          customJson.required_auths,
          customJson.required_posting_auths,
          customJson.id,
          customJson.json,
          privateKey
        );
      } else {
        const op = ['custom_json', customJson];
        return await client.broadcast.sendOperations([op], privateKey);
      }
    } catch(e: any) {
      if(e.message && e.message.includes('missing required posting authority')) {
         throw new Error("Invalid Posting Key or unauthorized.");
      }
      throw e;
    }
  }

  static async broadcastDeleteComment(client: any, author: string, permlink: string): Promise<any> {
    if (this.isLocked()) throw new Error('Vault is locked. Enter PIN.');
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.username === author);
    if (!account) throw new Error(`Account @${author} not found`);

    const wif = await this.decryptData(account.ciphertext, account.iv);
    
    try {
      const privateKey = getDSteem().PrivateKey.fromString(wif);
      const op = ['delete_comment', {
        author,
        permlink
      }];
      return await client.broadcast.sendOperations([op], privateKey);
    } catch(err: any) {
      console.error(err);
      throw new Error(`Broadcast logic failed: ${err.message || 'Unknown network error'}`);
    }
  }

  static async broadcastPost(client: any, comment: any, username: string, options?: any): Promise<any> {
    if (this.isLocked()) throw new Error('Vault is locked. Enter PIN.');
    
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.username === username);
    if (!account) throw new Error(`Account @${username} not found`);

    const wif = await this.decryptData(account.ciphertext, account.iv);
    
    try {
      const privateKey = getDSteem().PrivateKey.fromString(wif);
      const ops: any[] = [['comment', comment]];
      
      if (options) {
        ops.push(['comment_options', options]);
      }
      
      return await client.broadcast.sendOperations(ops, privateKey);
    } catch (e: any) {
      throw new Error('Publish error: ' + e.message, { cause: e });
    }
  }

  static async broadcastVote(client: any, vote: any, username: string): Promise<any> {
    if (this.isLocked()) throw new Error('Vault is locked. Enter PIN.');
    
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.username === username);
    if (!account) throw new Error(`Account @${username} not found`);

    const wif = await this.decryptData(account.ciphertext, account.iv);
    
    try {
      const privateKey = getDSteem().PrivateKey.fromString(wif);
      return await client.broadcast.vote(vote, privateKey);
    } catch (e: any) {
      throw new Error('Vote error: ' + e.message, { cause: e });
    }
  }

  static async signBuffer(buffer: Buffer | Uint8Array, username: string): Promise<string> {
    if (this.isLocked()) throw new Error('Vault is locked');
    
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.username === username);
    if (!account) throw new Error(`Account @${username} not found`);

    const wif = await this.decryptData(account.ciphertext, account.iv);

    try {
      const privateKey = getDSteem().PrivateKey.fromString(wif);
      const hash = getDSteem().cryptoUtils.sha256(Buffer.from(buffer));
      const signature = privateKey.sign(hash);
      return signature.toString();
    } catch (e: any) {
      throw new Error('Signing error: ' + e.message, { cause: e });
    }
  }

  /**
   * Формує підпис для завантаження зображення через Keychain
   */
  static async signImageChallengeWithKeychain(file: File | Blob, username: string): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
    const dataToSign = Buffer.concat([prefix, fileBuffer]);

    return new Promise((resolve, reject) => {
      if (!(window as any).steem_keychain) {
        reject(new Error("Steem Keychain not found"));
        return;
      }
      
      // Передаємо серіалізований JSON Buffer, як того вимагає протокол для зображень
      const message = JSON.stringify(dataToSign);
      (window as any).steem_keychain.requestSignBuffer(username, message, 'Posting', (response: any) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.message || "Keychain signing failed"));
        }
      });
    });
  }

  // --- Допоміжні методи ---

  private static bufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
  }

  private static base64ToBuffer(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  static async isInitialized(): Promise<boolean> {
    const data = await get(STORAGE_KEY_WRAPPED_MK);
    return !!data;
  }

  static async clearAll(): Promise<void> {
    await del(STORAGE_KEY_ACCOUNTS);
    await del(STORAGE_KEY_WRAPPED_MK);
    this.lock();
  }

  // --- Generic API Keys (Secured in Vault) ---
  static async saveApiKey(serviceName: string, key: string): Promise<void> {
    if (this.isLocked()) throw new Error('Vault is locked. Unlock to save API key.');
    const { ciphertext, iv } = await this.encryptData(key);
    const keys = await get<Record<string, { ciphertext: string; iv: string }>>(STORAGE_KEY_API_KEYS) || {};
    keys[serviceName] = { ciphertext, iv };
    await set(STORAGE_KEY_API_KEYS, keys);
  }

  static async getApiKey(serviceName: string): Promise<string | null> {
    if (this.isLocked()) return null;
    const keys = await get<Record<string, { ciphertext: string; iv: string }>>(STORAGE_KEY_API_KEYS);
    if (!keys || !keys[serviceName]) return null;
    try {
      return await this.decryptData(keys[serviceName].ciphertext, keys[serviceName].iv);
    } catch {
      return null;
    }
  }

  static async deleteApiKey(serviceName: string): Promise<void> {
    const keys = await get<Record<string, { ciphertext: string; iv: string }>>(STORAGE_KEY_API_KEYS);
    if (!keys) return;
    delete keys[serviceName];
    await set(STORAGE_KEY_API_KEYS, keys);
  }

  static async clearAllApiKeys(): Promise<void> {
    await del(STORAGE_KEY_API_KEYS);
    await del(PEXELS_KEY); // delete legacy pexels key
  }

  // --- Pexels API Key (Now secured in Vault) ---
  static async savePexelsKey(key: string): Promise<void> {
    if (this.isLocked()) throw new Error('Vault is locked. Unlock to save API key.');
    const { ciphertext, iv } = await this.encryptData(key);
    await set(PEXELS_KEY, { ciphertext, iv });
  }

  static async getPexelsKey(): Promise<string | null> {
    if (this.isLocked()) return null;
    const data = await get<{ ciphertext: string; iv: string }>(PEXELS_KEY);
    if (!data) return null;
    try {
      return await this.decryptData(data.ciphertext, data.iv);
    } catch {
      return null;
    }
  }

  static async deletePexelsKey(): Promise<void> {
    await del(PEXELS_KEY);
  }
}
