/**
 * Encryption utilities using Web Crypto API
 *
 * Provides AES-GCM-256 encryption with PBKDF2 key derivation.
 * All operations are performed client-side with zero external dependencies.
 */

import { EncryptedData } from './types'

/**
 * Algorithm constants
 */
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12

/**
 * Check if Web Crypto API is available
 */
export const isCryptoAvailable = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return (
    typeof crypto !== 'undefined' &&
    crypto.subtle !== undefined &&
    typeof crypto.getRandomValues === 'function'
  )
}

/**
 * Generate cryptographically secure random bytes
 */
const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Generate initialization vector
 */
const generateIV = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Convert Uint8Array to base64 string
 */
const toBase64 = (bytes: Uint8Array): string => {
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)))
}

/**
 * Convert base64 string to Uint8Array
 */
const fromBase64 = (str: string): Uint8Array => {
  return new Uint8Array(
    atob(str)
      .split('')
      .map((c) => c.charCodeAt(0))
  )
}

/**
 * Derive encryption key from password using PBKDF2
 */
const deriveKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt plaintext with password
 */
export const encrypt = async (
  plaintext: string | object,
  password: string
): Promise<EncryptedData> => {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available in this browser')
  }

  const data =
    typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext)
  const encoder = new TextEncoder()
  const salt = generateSalt()
  const iv = generateIV()
  const key = await deriveKey(password, salt)

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(data)
  )

  return {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encryptedBuffer))
  }
}

/**
 * Decrypt ciphertext with password
 */
export const decrypt = async (
  encrypted: EncryptedData,
  password: string
): Promise<string> => {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available in this browser')
  }

  const salt = fromBase64(encrypted.salt)
  const iv = fromBase64(encrypted.iv)
  const data = fromBase64(encrypted.data)
  const key = await deriveKey(password, salt)

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch {
    throw new Error('Decryption failed - incorrect password or corrupted data')
  }
}

/**
 * Verify password against encrypted data
 */
export const verifyPassword = async (
  encrypted: EncryptedData,
  password: string
): Promise<boolean> => {
  try {
    await decrypt(encrypted, password)
    return true
  } catch {
    return false
  }
}

/**
 * Hash password using SHA-256
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return toBase64(new Uint8Array(hashBuffer))
}

/**
 * Verify password against hash
 */
export const verifyPasswordHash = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}
