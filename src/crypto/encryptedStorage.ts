/**
 * Encrypted Storage Adapter for Redux Persist
 *
 * This storage adapter encrypts all data using AES-GCM-256 before storing
 * in localStorage when password protection is enabled.
 *
 * When encryption is enabled:
 * - Data is encrypted with the session password before storage
 * - Data is decrypted when read from storage
 * - If session password is not available, storage operations fail gracefully
 *
 * When encryption is disabled:
 * - Data is stored as plain JSON (default behavior)
 */

import { encrypt, decrypt, isCryptoAvailable } from './encrypt'
import { getSessionPassword, hasSessionPassword } from './transform'
import { EncryptedData } from './types'

/**
 * Marker to identify encrypted data in localStorage
 */
const ENCRYPTED_MARKER = '__ustaxes_encrypted__'

/**
 * Check if data is encrypted
 */
const isEncryptedData = (data: unknown): data is EncryptedWrapper => {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)[ENCRYPTED_MARKER] === true
  )
}

interface EncryptedWrapper {
  [ENCRYPTED_MARKER]: true
  encrypted: EncryptedData
}

/**
 * Create an encrypted wrapper for storing in localStorage
 */
const createEncryptedWrapper = (
  encrypted: EncryptedData
): EncryptedWrapper => ({
  [ENCRYPTED_MARKER]: true,
  encrypted
})

/**
 * Configuration for encrypted storage
 */
interface EncryptedStorageConfig {
  /**
   * Check if encryption should be used.
   * Default: checks if session password is set
   */
  isEncryptionEnabled?: () => boolean
}

/**
 * Create encrypted storage adapter
 */
export const createEncryptedStorage = (
  config: EncryptedStorageConfig = {}
): Storage => {
  const { isEncryptionEnabled = () => hasSessionPassword() } = config

  const storage = {
    /**
     * Get item from storage, decrypting if necessary
     */
    getItem: async (key: string): Promise<string | null> => {
      const raw = localStorage.getItem(key)
      if (raw === null) return null

      try {
        const parsed: unknown = JSON.parse(raw)

        // Check if data is encrypted
        if (isEncryptedData(parsed)) {
          // Need password to decrypt
          const password = getSessionPassword()
          if (!password) {
            console.warn(
              `[EncryptedStorage] Cannot decrypt ${key}: no session password`
            )
            // IMPORTANT: Return the raw encrypted data string so redux-persist
            // doesn't think there's no data and overwrite with defaults.
            // The app should show a login screen and re-request after login.
            return raw
          }

          try {
            const decrypted = await decrypt(parsed.encrypted, password)
            return decrypted
          } catch (err) {
            console.error(
              `[EncryptedStorage] Decryption failed for ${key}:`,
              err
            )
            // Return raw so we don't lose the encrypted data
            return raw
          }
        }

        // Data is not encrypted, return as-is
        return raw
      } catch {
        // Raw data is not JSON, return as-is
        return raw
      }
    },

    /**
     * Set item in storage, encrypting if password protection is enabled
     */
    setItem: async (key: string, value: string): Promise<void> => {
      const encryptionEnabled = isEncryptionEnabled()
      const cryptoAvailable = isCryptoAvailable()
      const password = getSessionPassword()

      // Protection: If encrypted data exists and we don't have a password,
      // LOG A WARNING but allow the write. The calling code (e.g., atomicDisableEncryption)
      // may intentionally want to overwrite encrypted data during transitions.
      // This is safer than blocking, which can cause race conditions.
      const currentData = localStorage.getItem(key)
      if (currentData) {
        try {
          const parsed: unknown = JSON.parse(currentData)
          if (isEncryptedData(parsed) && !password) {
            console.warn(
              `[EncryptedStorage] Warning: Overwriting encrypted ${key} without password. ` +
                `This is expected during disable-encryption transitions.`
            )
            // Note: We ALLOW the write now. Previous blocking caused issues.
            // If this is unexpected, the calling code should check state first.
          }
        } catch {
          // Current data is not JSON, safe to overwrite
        }
      }

      // Check if we should encrypt
      if (encryptionEnabled && cryptoAvailable) {
        if (password) {
          try {
            const encrypted = await encrypt(value, password)
            const wrapper = createEncryptedWrapper(encrypted)
            localStorage.setItem(key, JSON.stringify(wrapper))
            return
          } catch (err) {
            console.error(
              `[EncryptedStorage] Encryption failed for ${key}:`,
              err
            )
            // Fall through to store unencrypted
          }
        } else {
          console.warn(
            `[EncryptedStorage] Encryption enabled but no session password for ${key}`
          )
        }
      }

      // Store unencrypted
      localStorage.setItem(key, value)
    },

    /**
     * Remove item from storage
     */
    removeItem: (key: string): void => {
      localStorage.removeItem(key)
    },

    /**
     * Get number of items - required for Storage interface
     */
    get length(): number {
      return localStorage.length
    },

    /**
     * Get key at index - required for Storage interface
     */
    key: (index: number): string | null => {
      return localStorage.key(index)
    },

    /**
     * Clear all items - required for Storage interface
     */
    clear: (): void => {
      localStorage.clear()
    }
  }

  // Redux-persist supports async storage - the methods can return promises
  // We use 'as any' because TypeScript's Storage interface is synchronous,
  // but redux-persist's storage interface allows async methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return storage as any
}

/**
 * Re-encrypt all data when password changes
 *
 * Call this after user changes their password to re-encrypt all stored data
 * with the new password.
 */
export const reencryptStorage = async (
  keys: string[],
  oldPassword: string,
  newPassword: string
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = []
  const failed: string[] = []

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue

    try {
      const parsed: unknown = JSON.parse(raw)

      if (isEncryptedData(parsed)) {
        // Decrypt with old password
        const decrypted = await decrypt(parsed.encrypted, oldPassword)
        // Re-encrypt with new password
        const encrypted = await encrypt(decrypted, newPassword)
        const wrapper = createEncryptedWrapper(encrypted)
        localStorage.setItem(key, JSON.stringify(wrapper))
        success.push(key)
      }
    } catch (err) {
      console.error(`[EncryptedStorage] Re-encryption failed for ${key}:`, err)
      failed.push(key)
    }
  }

  return { success, failed }
}

/**
 * Decrypt all data (for disabling encryption)
 *
 * Call this when user disables password protection to convert
 * all encrypted data back to plain JSON.
 */
export const decryptAllStorage = async (
  keys: string[],
  password: string
): Promise<{ success: string[]; failed: string[]; skipped: string[] }> => {
  const success: string[] = []
  const failed: string[] = []
  const skipped: string[] = []

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) {
      continue
    }

    try {
      const parsed: unknown = JSON.parse(raw)
      const isEncrypted = isEncryptedData(parsed)

      if (isEncrypted) {
        // Decrypt
        const decrypted = await decrypt(parsed.encrypted, password)
        // Store as plain JSON
        localStorage.setItem(key, decrypted)
        success.push(key)
      } else {
        // Data is not encrypted, skip it
        skipped.push(key)
      }
    } catch (err) {
      console.error(`[decryptAllStorage] Decryption failed for ${key}:`, err)
      failed.push(key)
    }
  }

  return { success, failed, skipped }
}

/**
 * Encrypt all existing data (for enabling encryption)
 *
 * Call this when user enables password protection to convert
 * all existing plain data to encrypted format.
 */
export const encryptAllStorage = async (
  keys: string[],
  password: string
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = []
  const failed: string[] = []

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue

    try {
      const parsed: unknown = JSON.parse(raw)

      // Skip if already encrypted
      if (isEncryptedData(parsed)) {
        continue
      }

      // Encrypt the data
      const encrypted = await encrypt(raw, password)
      const wrapper = createEncryptedWrapper(encrypted)
      localStorage.setItem(key, JSON.stringify(wrapper))
      success.push(key)
    } catch (err) {
      console.error(`[EncryptedStorage] Encryption failed for ${key}:`, err)
      failed.push(key)
    }
  }

  return { success, failed }
}

/**
 * Check if localStorage has any encrypted data
 */
export const hasEncryptedData = (key: string): boolean => {
  const raw = localStorage.getItem(key)
  if (!raw) return false

  try {
    const parsed: unknown = JSON.parse(raw)
    return isEncryptedData(parsed)
  } catch {
    return false
  }
}

/**
 * Default encrypted storage instance
 */
export const encryptedStorage = createEncryptedStorage()
