/**
 * Tests for Encryption/Security feature types and defaults
 *
 * Tests the security type definitions, default values, and
 * encryption state management logic.
 */

import {
  SecuritySettings,
  LockState,
  EncryptedData,
  ExportedData,
  defaultSecuritySettings,
  defaultLockState,
  SessionTimeoutMinutes,
  StorageLocation
} from 'ustaxes/crypto/types'

describe('Encryption feature', () => {
  describe('SecuritySettings interface', () => {
    it('should have correct default values', () => {
      expect(defaultSecuritySettings.passwordEnabled).toBe(false)
      expect(defaultSecuritySettings.passwordHash).toBeNull()
      expect(defaultSecuritySettings.sessionTimeoutMinutes).toBe(15)
      expect(defaultSecuritySettings.sessionTimeoutEnabled).toBe(false)
      expect(defaultSecuritySettings.storageLocation).toBe('localStorage')
      expect(defaultSecuritySettings.lastActivity).toBeNull()
      expect(defaultSecuritySettings.biometricEnabled).toBe(false)
      expect(defaultSecuritySettings.biometricCredentialId).toBeNull()
      expect(defaultSecuritySettings.passwordRecoveryEnabled).toBe(false)
      expect(defaultSecuritySettings.securityQuestions).toBeNull()
    })

    it('should have all required properties', () => {
      const settings: SecuritySettings = defaultSecuritySettings

      expect(settings).toHaveProperty('passwordEnabled')
      expect(settings).toHaveProperty('passwordHash')
      expect(settings).toHaveProperty('sessionTimeoutMinutes')
      expect(settings).toHaveProperty('sessionTimeoutEnabled')
      expect(settings).toHaveProperty('storageLocation')
      expect(settings).toHaveProperty('lastActivity')
      expect(settings).toHaveProperty('biometricEnabled')
      expect(settings).toHaveProperty('biometricCredentialId')
      expect(settings).toHaveProperty('passwordRecoveryEnabled')
      expect(settings).toHaveProperty('securityQuestions')
    })
  })

  describe('LockState interface', () => {
    it('should have correct default values', () => {
      expect(defaultLockState.isLocked).toBe(false)
      expect(defaultLockState.failedAttempts).toBe(0)
      expect(defaultLockState.lockoutUntil).toBeNull()
    })

    it('should have all required properties', () => {
      const lock: LockState = defaultLockState

      expect(lock).toHaveProperty('isLocked')
      expect(lock).toHaveProperty('failedAttempts')
      expect(lock).toHaveProperty('lockoutUntil')
    })
  })

  describe('SessionTimeoutMinutes type', () => {
    it('should allow valid timeout values', () => {
      const validTimeouts: SessionTimeoutMinutes[] = [5, 10, 15, 30, 60, null]

      validTimeouts.forEach((timeout) => {
        const settings: SecuritySettings = {
          ...defaultSecuritySettings,
          sessionTimeoutMinutes: timeout
        }
        expect(settings.sessionTimeoutMinutes).toBe(timeout)
      })
    })

    it('should support null for no timeout', () => {
      const settings: SecuritySettings = {
        ...defaultSecuritySettings,
        sessionTimeoutMinutes: null
      }
      expect(settings.sessionTimeoutMinutes).toBeNull()
    })
  })

  describe('StorageLocation type', () => {
    it('should allow localStorage', () => {
      const location: StorageLocation = 'localStorage'
      expect(location).toBe('localStorage')
    })

    it('should allow file', () => {
      const location: StorageLocation = 'file'
      expect(location).toBe('file')
    })
  })

  describe('EncryptedData interface', () => {
    it('should have correct structure', () => {
      const encrypted: EncryptedData = {
        version: 1,
        salt: 'base64salt',
        iv: 'base64iv',
        data: 'base64encrypteddata'
      }

      expect(encrypted.version).toBe(1)
      expect(typeof encrypted.salt).toBe('string')
      expect(typeof encrypted.iv).toBe('string')
      expect(typeof encrypted.data).toBe('string')
    })
  })

  describe('ExportedData interface', () => {
    it('should have correct structure for plain export', () => {
      const exported: ExportedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appVersion: '0.1.23',
        encrypted: false,
        data: { test: 'data' }
      }

      expect(exported.version).toBe('1.0')
      expect(exported.encrypted).toBe(false)
      expect(exported.encryption).toBeUndefined()
    })

    it('should have correct structure for encrypted export', () => {
      const exported: ExportedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appVersion: '0.1.23',
        encrypted: true,
        data: 'encryptedBase64String',
        encryption: {
          algorithm: 'AES-GCM-256',
          kdf: 'PBKDF2-SHA256-100000',
          salt: 'randomSalt',
          iv: 'randomIV'
        }
      }

      expect(exported.encrypted).toBe(true)
      expect(exported.encryption).toBeDefined()
      expect(exported.encryption?.algorithm).toBe('AES-GCM-256')
    })
  })

  describe('Security state transitions', () => {
    it('should transition from disabled to enabled', () => {
      const initial: SecuritySettings = { ...defaultSecuritySettings }
      expect(initial.passwordEnabled).toBe(false)

      const enabled: SecuritySettings = {
        ...initial,
        passwordEnabled: true,
        passwordHash: 'hashedPassword123'
      }
      expect(enabled.passwordEnabled).toBe(true)
      expect(enabled.passwordHash).toBe('hashedPassword123')
    })

    it('should transition from enabled to disabled', () => {
      const enabled: SecuritySettings = {
        ...defaultSecuritySettings,
        passwordEnabled: true,
        passwordHash: 'hashedPassword123'
      }

      const disabled: SecuritySettings = {
        ...enabled,
        passwordEnabled: false,
        passwordHash: null
      }
      expect(disabled.passwordEnabled).toBe(false)
      expect(disabled.passwordHash).toBeNull()
    })

    it('should track session timeout configuration', () => {
      const settings: SecuritySettings = {
        ...defaultSecuritySettings,
        sessionTimeoutEnabled: true,
        sessionTimeoutMinutes: 30
      }

      expect(settings.sessionTimeoutEnabled).toBe(true)
      expect(settings.sessionTimeoutMinutes).toBe(30)
    })
  })

  describe('Lock state transitions', () => {
    it('should transition to locked state', () => {
      const unlocked: LockState = { ...defaultLockState }
      expect(unlocked.isLocked).toBe(false)

      const locked: LockState = {
        ...unlocked,
        isLocked: true
      }
      expect(locked.isLocked).toBe(true)
    })

    it('should track failed attempts', () => {
      let lock: LockState = { ...defaultLockState }

      // Simulate 3 failed attempts
      for (let i = 1; i <= 3; i++) {
        lock = { ...lock, failedAttempts: i }
      }

      expect(lock.failedAttempts).toBe(3)
    })

    it('should set lockout time after threshold', () => {
      const lockoutTime = Date.now() + 5 * 60 * 1000 // 5 minutes
      const lock: LockState = {
        isLocked: true,
        failedAttempts: 5,
        lockoutUntil: lockoutTime
      }

      expect(lock.lockoutUntil).toBeGreaterThan(Date.now())
    })

    it('should reset on successful unlock', () => {
      const lockedState: LockState = {
        isLocked: true,
        failedAttempts: 3,
        lockoutUntil: Date.now() + 60000
      }

      // The locked state should have failed attempts
      expect(lockedState.failedAttempts).toBeGreaterThan(0)

      const reset: LockState = {
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null
      }

      expect(reset).toEqual(defaultLockState)
    })
  })

  describe('Last activity tracking', () => {
    it('should update last activity timestamp', () => {
      const now = Date.now()
      const settings: SecuritySettings = {
        ...defaultSecuritySettings,
        lastActivity: now
      }

      expect(settings.lastActivity).toBe(now)
    })

    it('should detect session expiry', () => {
      const timeoutMinutes = 15
      const lastActivity = Date.now() - 20 * 60 * 1000 // 20 minutes ago

      const settings: SecuritySettings = {
        ...defaultSecuritySettings,
        sessionTimeoutEnabled: true,
        sessionTimeoutMinutes: timeoutMinutes,
        lastActivity
      }

      const now = Date.now()
      const timeoutMs = timeoutMinutes * 60 * 1000
      const isExpired =
        settings.lastActivity !== null &&
        now - settings.lastActivity > timeoutMs

      expect(isExpired).toBe(true)
    })

    it('should not be expired within timeout window', () => {
      const timeoutMinutes = 15
      const lastActivity = Date.now() - 5 * 60 * 1000 // 5 minutes ago

      const settings: SecuritySettings = {
        ...defaultSecuritySettings,
        sessionTimeoutEnabled: true,
        sessionTimeoutMinutes: timeoutMinutes,
        lastActivity
      }

      const now = Date.now()
      const timeoutMs = timeoutMinutes * 60 * 1000
      const isExpired =
        settings.lastActivity !== null &&
        now - settings.lastActivity > timeoutMs

      expect(isExpired).toBe(false)
    })
  })
})
