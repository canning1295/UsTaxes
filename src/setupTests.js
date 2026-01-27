/* eslint-disable */
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

// TextEncoder/TextDecoder polyfill for Node.js
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Web Crypto API polyfill for Jest/Node.js environment
if (typeof global.crypto === 'undefined' || !global.crypto.subtle) {
  const crypto = require('crypto')

  global.crypto = {
    getRandomValues: (arr) => {
      const bytes = crypto.randomBytes(arr.length)
      arr.set(bytes)
      return arr
    },
    subtle: {
      importKey: async (format, keyData, algorithm) => {
        if (algorithm === 'PBKDF2') {
          return { type: 'raw', keyData: Buffer.from(keyData) }
        }
        return { type: format, keyData: Buffer.from(keyData), algorithm }
      },
      deriveBits: async (algorithm, baseKey, length) => {
        return new Promise((resolve, reject) => {
          crypto.pbkdf2(
            baseKey.keyData,
            Buffer.from(algorithm.salt),
            algorithm.iterations,
            length / 8,
            'sha256',
            (err, derivedKey) => {
              if (err) reject(err)
              else resolve(derivedKey)
            }
          )
        })
      },
      deriveKey: async (algorithm, baseKey, derivedKeyAlgorithm) => {
        const bits = await global.crypto.subtle.deriveBits(
          algorithm,
          baseKey,
          derivedKeyAlgorithm.length
        )
        return { type: 'aes-gcm', keyData: Buffer.from(bits) }
      },
      encrypt: async (algorithm, key, data) => {
        const iv = Buffer.from(algorithm.iv)
        const cipher = crypto.createCipheriv('aes-256-gcm', key.keyData, iv)
        const encrypted = Buffer.concat([
          cipher.update(Buffer.from(data)),
          cipher.final()
        ])
        const authTag = cipher.getAuthTag()
        return Buffer.concat([encrypted, authTag])
      },
      decrypt: async (algorithm, key, data) => {
        const iv = Buffer.from(algorithm.iv)
        const dataBuffer = Buffer.from(data)
        const authTag = dataBuffer.slice(-16)
        const encrypted = dataBuffer.slice(0, -16)
        const decipher = crypto.createDecipheriv('aes-256-gcm', key.keyData, iv)
        decipher.setAuthTag(authTag)
        return Buffer.concat([decipher.update(encrypted), decipher.final()])
      },
      digest: async (algorithm, data) => {
        const hash = crypto.createHash('sha256')
        hash.update(Buffer.from(data))
        return hash.digest()
      }
    },
    randomUUID: () => crypto.randomUUID()
  }
}

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

global.console = {
  log: jest.fn(),
  error: jest.fn(),

  // Keep native behaviour for other methods, use those to print out things in your own tests
  warn: console.warn,
  info: console.info,
  debug: console.debug
}
