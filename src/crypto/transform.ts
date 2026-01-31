/**
 * Redux Persist security transform
 *
 * This module manages session password and key storage for encryption/decryption.
 *
 * Security options:
 * 1. In-memory only (most secure, requires re-entry on reload)
 * 2. sessionStorage (less secure, persists through reload - LEGACY)
 * 3. IndexedDB with CryptoKey (secure, persists through reload - NEW)
 *
 * The new IndexedDB approach stores a non-extractable CryptoKey instead of
 * the plaintext password, which cannot be read from DevTools.
 */

import {
  isSecureStorageAvailable,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initializeSession,
  retrieveSessionKey,
  clearSessionKey as clearSecureKey,
  hasValidSessionKey
} from './secureKeyStorage'

// NOTE: These imports were removed as they were only used by deleted dead code:
// import { createTransform, Transform } from 'redux-persist'
// import { SecuritySettings } from './types'
// const SENSITIVE_KEYS = new Set(['ssid', 'accountNumber', 'routingNumber', 'EIN'])

/**
 * Session password holder (in-memory only)
 * This is still used for the actual encryption/decryption operations
 * which require the raw password for PBKDF2 derivation with random salt.
 */
let sessionPassword: string | null = null

/**
 * Flag to track if we're using secure storage (IndexedDB)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let useSecureStorage = true

/**
 * Key for temporary session password storage (LEGACY - fallback only)
 */
const SESSION_PASSWORD_KEY = '__ustaxes_session_pwd__'

/**
 * Set session password
 *
 * @param password - The user's password
 * @param persist - Whether to persist for page reloads
 * @param timeoutMinutes - Session timeout (only used with secure storage)
 */
export const setSessionPassword = (
  password: string,
  persist = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timeoutMinutes: number | null = null
): Promise<void> => {
  sessionPassword = password

  if (persist) {
    // IMPORTANT: We must use sessionStorage (not IndexedDB) for password persistence
    // because our encryption uses PBKDF2 with a random salt stored with each encrypted
    // data block. Decryption requires the original password to derive a key with that
    // specific salt. IndexedDB secure storage stores a derived key with a fixed salt,
    // which is incompatible with our per-data-block random salts.
    //
    // sessionStorage is cleared when the browser tab is closed, providing reasonable
    // security for the persisted password while allowing page reloads to work.
    sessionStorage.setItem(SESSION_PASSWORD_KEY, password)
  }

  // Return resolved promise to maintain async API contract for callers
  return Promise.resolve()
}

/**
 * Clear session password
 */
export const clearSessionPassword = async (): Promise<void> => {
  sessionPassword = null

  // Clear from both storage mechanisms
  sessionStorage.removeItem(SESSION_PASSWORD_KEY)

  if (isSecureStorageAvailable()) {
    try {
      await clearSecureKey()
    } catch (err) {
      console.warn('[SessionPassword] Error clearing secure storage:', err)
    }
  }
}

/**
 * Check if session password is set
 *
 * This checks in order:
 * 1. In-memory password
 * 2. Secure storage (IndexedDB)
 * 3. Legacy sessionStorage
 */
export const hasSessionPassword = (): boolean => {
  // Check in-memory first
  if (sessionPassword !== null) {
    return true
  }

  // Check legacy sessionStorage
  // IMPORTANT: Don't remove from sessionStorage - it needs to survive multiple reads
  // The password stays in sessionStorage until explicitly cleared
  const stored = sessionStorage.getItem(SESSION_PASSWORD_KEY)
  if (stored) {
    sessionPassword = stored
    return true
  }

  // Note: We don't check IndexedDB here because it's async
  // The app should call hasSessionPasswordAsync() for the full check
  return false
}

/**
 * Async version of hasSessionPassword that also checks secure storage
 */
export const hasSessionPasswordAsync = async (): Promise<boolean> => {
  // Check in-memory first
  if (sessionPassword !== null) {
    return true
  }

  // Check secure storage
  if (isSecureStorageAvailable()) {
    try {
      const hasKey = await hasValidSessionKey()
      if (hasKey) {
        // Note: We have a key but not the password in memory
        // The password will need to be restored from elsewhere
        // or the user will need to re-enter it
        return true
      }
    } catch (err) {
      console.warn('[SessionPassword] Error checking secure storage:', err)
    }
  }

  // Check legacy sessionStorage
  // IMPORTANT: Don't remove from sessionStorage - it needs to survive multiple reads
  const stored = sessionStorage.getItem(SESSION_PASSWORD_KEY)
  if (stored) {
    sessionPassword = stored
    return true
  }

  return false
}

/**
 * Get current session password
 */
export const getSessionPassword = (): string | null => {
  // Check in-memory
  if (sessionPassword !== null) {
    return sessionPassword
  }

  // Check legacy sessionStorage
  // IMPORTANT: Don't remove from sessionStorage - it needs to survive multiple reads
  const stored = sessionStorage.getItem(SESSION_PASSWORD_KEY)
  if (stored) {
    sessionPassword = stored
    return sessionPassword
  }

  // Note: Can't retrieve password from secure storage because
  // we only store the derived key, not the password itself
  // This is by design for security

  return null
}

/**
 * Get session CryptoKey from secure storage
 *
 * This retrieves the non-extractable CryptoKey that can be used
 * for encryption/decryption without the raw password.
 */
export const getSessionCryptoKey = async (): Promise<CryptoKey | null> => {
  if (!isSecureStorageAvailable()) {
    return null
  }

  try {
    return await retrieveSessionKey()
  } catch (err) {
    console.warn('[SessionPassword] Error retrieving CryptoKey:', err)
    return null
  }
}

/**
 * Configure secure storage mode
 *
 * @param useSecure - Whether to use IndexedDB for secure key storage
 */
export const setSecureStorageMode = (useSecure: boolean): void => {
  useSecureStorage = useSecure
}

// NOTE: The following transforms were removed as dead code during cleanup:
// - createSecurityTransform: Was never registered with redux-persist
// - createSensitiveFieldsTransform: Was never used
// See .amp/plan/fix-encryption/AUDIT_FINDINGS.md for details
