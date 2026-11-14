import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Custom Error for integrity / tampering detection.
 */
export class IntegrityCheckError extends Error {
  constructor(message) {
    super(message || 'INTEGRITY CHECK FAILED: Ciphertext was tampered with in transit or storage');
    this.name = 'IntegrityCheckError';
  }
}

/**
 * Check if Web Crypto API (window.crypto.subtle) is available.
 * Note: Browsers disable crypto.subtle on non-secure origins (e.g. mobile accessing http://192.168.x.x:5173).
 */
export function isCryptoSubtleSupported() {
  return (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.subtle !== 'undefined' &&
    typeof window.crypto.subtle.encrypt === 'function' &&
    typeof window.crypto.subtle.decrypt === 'function'
  );
}

export function getCryptoProviderName() {
  return isCryptoSubtleSupported()
    ? 'Web Crypto API (Hardware-Accelerated)'
    : '@noble/ciphers (Pure-JS Fallback for LAN/HTTP)';
}

/**
 * Secure random byte generator.
 * window.crypto.getRandomValues works on all origins (including http://192.168.x.x).
 */
export function getRandomBytes(length) {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for Node / test environments
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// Base64 & Base64Url Helpers
export function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return (typeof window !== 'undefined' ? window.btoa(binary) : globalThis.btoa(binary));
}

export function fromBase64(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = (typeof window !== 'undefined' ? window.atob(base64) : globalThis.atob(base64));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlEncode(bytes) {
  return toBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return fromBase64(base64);
}

/**
 * Derives a 256-bit key from a passphrase using PBKDF2 (100,000 iterations, SHA-256).
 */
async function deriveKeyFromPassphrase(passphrase, salt) {
  if (isCryptoSubtleSupported()) {
    try {
      const passBytes = new TextEncoder().encode(passphrase);
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passBytes,
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      return new Uint8Array(derivedBits);
    } catch (e) {
      console.warn('WebCrypto PBKDF2 failed, using noble fallback:', e);
    }
  }

  // Noble fallback
  return pbkdf2(sha256, passphrase, salt, { c: 100000, dkLen: 32 });
}

/**
 * Combines random AES key with passphrase-derived key using SHA-256.
 * SHA-256(rawKey || passphraseKey)
 */
async function combineKeys(rawKey, passphraseKey) {
  const combined = new Uint8Array(64);
  combined.set(rawKey, 0);
  combined.set(passphraseKey, 32);

  if (isCryptoSubtleSupported()) {
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', combined);
      return new Uint8Array(digest);
    } catch (e) {
      console.warn('WebCrypto SHA-256 digest failed, using noble fallback:', e);
    }
  }

  return sha256(combined);
}

/**
 * Encrypt secret with AES-256-GCM.
 * Generates 256-bit random key (K) and 96-bit IV.
 * If passphrase is provided, derives key and combines with K.
 *
 * @param {string} plaintext - Content to encrypt
 * @param {string} [passphrase] - Optional user passphrase
 * @returns {Promise<{ ciphertext: string, iv: string, salt: string|null, urlFragment: string, hasPassphrase: boolean }>}
 */
export async function encryptSecret(plaintext, passphrase = '') {
  const rawKey = getRandomBytes(32); // 256-bit key
  const iv = getRandomBytes(12); // 96-bit IV
  let salt = null;
  let encryptionKey = rawKey;
  const hasPassphrase = Boolean(passphrase && passphrase.trim().length > 0);

  if (hasPassphrase) {
    salt = getRandomBytes(16); // 128-bit salt
    const passphraseKey = await deriveKeyFromPassphrase(passphrase.trim(), salt);
    encryptionKey = await combineKeys(rawKey, passphraseKey);
  }

  const plainBytes = new TextEncoder().encode(plaintext);
  let cipherBytes;

  if (isCryptoSubtleSupported()) {
    try {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        encryptionKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      const encryptedBuf = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        plainBytes
      );
      cipherBytes = new Uint8Array(encryptedBuf);
    } catch (e) {
      console.warn('WebCrypto encrypt failed, using noble fallback:', e);
      cipherBytes = gcm(encryptionKey, iv).encrypt(plainBytes);
    }
  } else {
    cipherBytes = gcm(encryptionKey, iv).encrypt(plainBytes);
  }

  return {
    ciphertext: toBase64(cipherBytes),
    iv: toBase64(iv),
    salt: salt ? toBase64(salt) : null,
    urlFragment: base64UrlEncode(rawKey),
    hasPassphrase,
  };
}

/**
 * Decrypt secret with AES-256-GCM.
 * Validates authentication tag (128-bit) and throws IntegrityCheckError if tampered.
 *
 * @param {Object} params
 * @param {string} params.urlFragment - Base64Url key from URL hash (#)
 * @param {string} params.ciphertext - Base64 ciphertext + tag from backend
 * @param {string} params.iv - Base64 IV from backend
 * @param {string|null} params.salt - Base64 salt from backend (if hasPassphrase)
 * @param {boolean} params.hasPassphrase - Whether secret requires passphrase
 * @param {string} [params.passphrase] - User-entered passphrase
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptSecret({
  urlFragment,
  ciphertext,
  iv,
  salt,
  hasPassphrase,
  passphrase = '',
}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!urlFragment) {
    throw new Error('Encryption key missing from URL fragment (#). Secret cannot be decrypted.');
  }

  const rawKey = base64UrlDecode(urlFragment);
  if (rawKey.length !== 32) {
    throw new Error('Invalid key length in URL fragment. Expected 256-bit AES key.');
  }

  const ivBytes = fromBase64(iv);
  const cipherBytes = fromBase64(ciphertext);
  let encryptionKey = rawKey;

  if (hasPassphrase) {
    if (!passphrase || passphrase.trim().length === 0) {
      throw new Error('Passphrase is required to unlock this secret.');
    }
    if (!salt) {
      throw new Error('Corrupted secret: Missing salt for passphrase-protected secret.');
    }
    const saltBytes = fromBase64(salt);
    const passphraseKey = await deriveKeyFromPassphrase(passphrase.trim(), saltBytes);
    encryptionKey = await combineKeys(rawKey, passphraseKey);
  }

  let decryptedBytes;
  let usedEngine = '@noble/ciphers (Pure-JS Fallback)';

  if (isCryptoSubtleSupported()) {
    try {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        encryptionKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      const decryptedBuf = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        cryptoKey,
        cipherBytes
      );
      decryptedBytes = new Uint8Array(decryptedBuf);
      usedEngine = 'Web Crypto API (Hardware-Accelerated AES-256-GCM)';
    } catch (e) {
      // If WebCrypto throws OperationError or tag mismatch
      if (e.name === 'OperationError' || e.message?.toLowerCase().includes('tag')) {
        throw new IntegrityCheckError(
          hasPassphrase
            ? 'Incorrect passphrase or ciphertext was tampered with in storage/transit.'
            : 'INTEGRITY CHECK FAILED: Ciphertext or authentication tag was tampered with in storage or transit!'
        );
      }
      // If it failed because subtle is unsupported or failed, try noble fallback
      try {
        decryptedBytes = gcm(encryptionKey, ivBytes).decrypt(cipherBytes);
        usedEngine = '@noble/ciphers (Pure-JS Fallback)';
      } catch (nobleErr) {
        throw new IntegrityCheckError(
          'INTEGRITY CHECK FAILED: Ciphertext or authentication tag was tampered with in storage or transit!'
        );
      }
    }
  } else {
    // Pure JS Noble fallback (used on mobile phones over HTTP LAN IP)
    try {
      decryptedBytes = gcm(encryptionKey, ivBytes).decrypt(cipherBytes);
      usedEngine = '@noble/ciphers (Pure-JS Fallback for LAN HTTP)';
    } catch (e) {
      throw new IntegrityCheckError(
        hasPassphrase
          ? 'Incorrect passphrase or ciphertext was tampered with in storage/transit.'
          : 'INTEGRITY CHECK FAILED: Ciphertext or authentication tag was tampered with in storage or transit!'
      );
    }
  }

  const plainTextStr = new TextDecoder().decode(decryptedBytes);
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.max(0.1, Math.round((endTime - startTime) * 10) / 10);

  // Return enhanced string object with performance metadata
  const res = new String(plainTextStr);
  res.plaintext = plainTextStr;
  res.engine = usedEngine;
  res.durationMs = durationMs;
  return res;
}
