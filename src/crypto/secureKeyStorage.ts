/**
 * Secure Key Storage using IndexedDB
 *
 * This module provides secure session key storage using IndexedDB with
 * non-extractable CryptoKey objects. Unlike sessionStorage which stores
 * passwords as plain text that can be read from DevTools, CryptoKey objects
 * marked as non-extractable cannot have their raw key material exported.
 *
 * Flow:
 * 1. User enters password
 * 2. Password is used to derive a CryptoKey
 * 3. CryptoKey is stored in IndexedDB (non-extractable)
 * 4. On page reload, the CryptoKey is retrieved and used for decryption
 * 5. The original password is never stored anywhere
 */

const DB_NAME = 'ustaxes-security'
const DB_VERSION = 1
const STORE_NAME = 'session-keys'
const SESSION_KEY_ID = 'current-session'

/**
 * Key storage entry
 */
interface StoredKeyEntry {
  id: string
  key: CryptoKey
  createdAt: number
  expiresAt: number | null
}

/**
 * Open or create the IndexedDB database
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error(
        '[SecureKeyStorage] Failed to open database:',
        request.error
      )
      reject(new Error('Failed to open secure key database'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Derive a non-extractable CryptoKey from password
 *
 * This is the key security feature: the CryptoKey is marked as non-extractable,
 * which means even if an attacker gets access to IndexedDB, they cannot
 * extract the raw key material.
 */
export const deriveSessionKey = async (
  password: string
): Promise<CryptoKey> => {
  // First, import the password as a CryptoKey for PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false, // Not extractable
    ['deriveKey']
  )

  // Fixed salt for session key derivation (this is okay since we're deriving a session key,
  // not storing encrypted data - the actual data encryption uses random salt)
  const salt = new TextEncoder().encode('ustaxes-session-key-v1')

  // Derive an AES-GCM key that is non-extractable
  const sessionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // Same as main encryption
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // NON-EXTRACTABLE - this is the key security feature!
    ['encrypt', 'decrypt']
  )

  return sessionKey
}

/**
 * Store session key in IndexedDB
 *
 * @param key - The non-extractable CryptoKey to store
 * @param timeoutMinutes - Optional timeout after which the key expires (null = no expiry)
 */
export const storeSessionKey = async (
  key: CryptoKey,
  timeoutMinutes: number | null = null
): Promise<void> => {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const entry: StoredKeyEntry = {
      id: SESSION_KEY_ID,
      key,
      createdAt: Date.now(),
      expiresAt: timeoutMinutes ? Date.now() + timeoutMinutes * 60 * 1000 : null
    }

    const request = store.put(entry)

    request.onerror = () => {
      console.error('[SecureKeyStorage] Failed to store key:', request.error)
      reject(new Error('Failed to store session key'))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Retrieve session key from IndexedDB
 *
 * Returns the stored CryptoKey if it exists and hasn't expired,
 * otherwise returns null.
 */
export const retrieveSessionKey = async (): Promise<CryptoKey | null> => {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(SESSION_KEY_ID)

      request.onerror = () => {
        console.error(
          '[SecureKeyStorage] Failed to retrieve key:',
          request.error
        )
        resolve(null)
      }

      request.onsuccess = () => {
        const entry = request.result as StoredKeyEntry | undefined

        if (!entry) {
          resolve(null)
          return
        }

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          // Clean up expired key
          void clearSessionKey()
          resolve(null)
          return
        }

        resolve(entry.key)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (err) {
    console.error('[SecureKeyStorage] Error retrieving session key:', err)
    return null
  }
}

/**
 * Check if a session key exists and is valid
 */
export const hasValidSessionKey = async (): Promise<boolean> => {
  const key = await retrieveSessionKey()
  return key !== null
}

/**
 * Clear the session key from IndexedDB
 */
export const clearSessionKey = async (): Promise<void> => {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(SESSION_KEY_ID)

      request.onerror = () => {
        console.error('[SecureKeyStorage] Failed to clear key:', request.error)
        // Resolve anyway - best effort cleanup
        resolve()
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (err) {
    console.error('[SecureKeyStorage] Error clearing session key:', err)
  }
}

/**
 * Update session key expiration time
 * Call this on user activity to extend the session
 */
export const extendSessionKey = async (
  timeoutMinutes: number
): Promise<void> => {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(SESSION_KEY_ID)

      request.onerror = () => {
        resolve() // Best effort
      }

      request.onsuccess = () => {
        const entry = request.result as StoredKeyEntry | undefined
        if (entry) {
          entry.expiresAt = Date.now() + timeoutMinutes * 60 * 1000
          store.put(entry)
        }
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (err) {
    console.error('[SecureKeyStorage] Error extending session key:', err)
  }
}

/**
 * Encrypt data using the session key
 *
 * This is a convenience function that retrieves the session key
 * and uses it to encrypt data.
 */
export const encryptWithSessionKey = async (
  data: string
): Promise<{
  iv: string
  ciphertext: string
} | null> => {
  const key = await retrieveSessionKey()
  if (!key) {
    console.warn('[SecureKeyStorage] No session key available for encryption')
    return null
  }

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    iv: btoa(String.fromCharCode.apply(null, Array.from(iv))),
    ciphertext: btoa(
      String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertext)))
    )
  }
}

/**
 * Decrypt data using the session key
 */
export const decryptWithSessionKey = async (
  iv: string,
  ciphertext: string
): Promise<string | null> => {
  const key = await retrieveSessionKey()
  if (!key) {
    console.warn('[SecureKeyStorage] No session key available for decryption')
    return null
  }

  try {
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
    const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) =>
      c.charCodeAt(0)
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBytes
    )

    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('[SecureKeyStorage] Decryption failed:', err)
    return null
  }
}

/**
 * Initialize session with password
 *
 * This is the main entry point when a user logs in:
 * 1. Derives a CryptoKey from the password
 * 2. Stores it securely in IndexedDB
 * 3. The password is never stored
 */
export const initializeSession = async (
  password: string,
  timeoutMinutes: number | null = null
): Promise<CryptoKey> => {
  // Derive non-extractable key from password
  const sessionKey = await deriveSessionKey(password)

  // Store in IndexedDB
  await storeSessionKey(sessionKey, timeoutMinutes)

  return sessionKey
}

/**
 * Check if IndexedDB is available
 */
export const isSecureStorageAvailable = (): boolean => {
  return (
    typeof indexedDB !== 'undefined' && typeof crypto.subtle !== 'undefined'
  )
}
