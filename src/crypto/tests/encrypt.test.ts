/**
 * Tests for encryption utilities
 */

import {
  encrypt,
  decrypt,
  verifyPassword,
  hashPassword,
  verifyPasswordHash,
  isCryptoAvailable
} from '../encrypt'

describe('Encryption utilities', () => {
  describe('isCryptoAvailable', () => {
    it('should return true when Web Crypto API is available', () => {
      expect(isCryptoAvailable()).toBe(true)
    })
  })

  describe('encrypt and decrypt', () => {
    const testPassword = 'testPassword123!'
    const testData = { ssn: '123-45-6789', name: 'John Doe' }

    it('should encrypt and decrypt string data', async () => {
      const plaintext = 'Hello, World!'
      const encrypted = await encrypt(plaintext, testPassword)

      expect(encrypted).toHaveProperty('version', 1)
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('data')

      const decrypted = await decrypt(encrypted, testPassword)
      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt and decrypt object data', async () => {
      const encrypted = await encrypt(testData, testPassword)
      const decrypted = await decrypt(encrypted, testPassword)

      expect(JSON.parse(decrypted)).toEqual(testData)
    })

    it('should produce different ciphertext for same plaintext', async () => {
      const encrypted1 = await encrypt('same text', testPassword)
      const encrypted2 = await encrypt('same text', testPassword)

      expect(encrypted1.salt).not.toBe(encrypted2.salt)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.data).not.toBe(encrypted2.data)
    })

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await encrypt('secret', testPassword)

      await expect(decrypt(encrypted, 'wrongPassword')).rejects.toThrow(
        'Decryption failed'
      )
    })

    it('should fail to decrypt with corrupted data', async () => {
      const encrypted = await encrypt('secret', testPassword)

      const corruptedData = {
        ...encrypted,
        data: encrypted.data.slice(0, -10) + 'corrupted!'
      }

      await expect(decrypt(corruptedData, testPassword)).rejects.toThrow()
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword'
      const encrypted = await encrypt('test data', password)

      const isValid = await verifyPassword(encrypted, password)
      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const encrypted = await encrypt('test data', 'correctPassword')

      const isValid = await verifyPassword(encrypted, 'wrongPassword')
      expect(isValid).toBe(false)
    })
  })

  describe('hashPassword', () => {
    it('should produce consistent hash for same password', async () => {
      const password = 'myPassword123'

      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different passwords', async () => {
      const hash1 = await hashPassword('password1')
      const hash2 = await hashPassword('password2')

      expect(hash1).not.toBe(hash2)
    })

    it('should return a base64 string', async () => {
      const hash = await hashPassword('testPassword')

      expect(typeof hash).toBe('string')
      expect(() => atob(hash)).not.toThrow()
    })
  })

  describe('verifyPasswordHash', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'mySecurePassword'
      const hash = await hashPassword(password)

      const isValid = await verifyPasswordHash(password, hash)
      expect(isValid).toBe(true)
    })

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('originalPassword')

      const isValid = await verifyPasswordHash('differentPassword', hash)
      expect(isValid).toBe(false)
    })
  })
})

describe('Encryption with real data scenarios', () => {
  const password = 'SecureP@ssw0rd!'

  it('should handle tax data with SSN and bank info', async () => {
    const taxData = {
      ssn: '123-45-6789',
      bankAccount: '987654321',
      routingNumber: '123456789',
      income: 75000
    }

    const encrypted = await encrypt(taxData, password)
    const decrypted = await decrypt(encrypted, password)

    expect(JSON.parse(decrypted)).toEqual(taxData)
  })

  it('should handle large data sets', async () => {
    const largeData = {
      w2s: Array(100)
        .fill(null)
        .map((_, i) => ({
          employer: `Employer ${i}`,
          income: Math.random() * 100000,
          withholding: Math.random() * 20000
        }))
    }

    const encrypted = await encrypt(largeData, password)
    const decrypted = await decrypt(encrypted, password)

    expect(JSON.parse(decrypted)).toEqual(largeData)
  })

  it('should handle unicode characters in data', async () => {
    const unicodeData = {
      name: 'José García',
      address: '日本東京'
    }

    const encrypted = await encrypt(unicodeData, password)
    const decrypted = await decrypt(encrypted, password)

    expect(JSON.parse(decrypted)).toEqual(unicodeData)
  })
})
