/**
 * Security-related type definitions
 */

/**
 * Session timeout options in minutes, or null for never
 */
export type SessionTimeoutMinutes = 5 | 10 | 15 | 30 | 60 | null

/**
 * Where encrypted data is stored
 */
export type StorageLocation = 'localStorage' | 'file'

/**
 * Security question for password recovery
 */
export interface SecurityQuestion {
  question: string
  answerHash: string
}

/**
 * User's security preferences
 */
export interface SecuritySettings {
  passwordEnabled: boolean
  passwordHash: string | null
  sessionTimeoutMinutes: SessionTimeoutMinutes
  sessionTimeoutEnabled: boolean
  storageLocation: StorageLocation
  lastActivity: number | null
  biometricEnabled: boolean
  biometricCredentialId: string | null
  passwordRecoveryEnabled: boolean
  securityQuestions: SecurityQuestion[] | null
}

/**
 * Current lock state of the application
 */
export interface LockState {
  isLocked: boolean
  failedAttempts: number
  lockoutUntil: number | null
}

/**
 * Wrapper for encrypted state in localStorage
 */
export interface EncryptedStateWrapper {
  encrypted: true
  securitySettings: SecuritySettings
  encryptedData: EncryptedData
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  version: number
  salt: string
  iv: string
  data: string
}

/**
 * Export file format
 */
export interface ExportedData {
  version: string
  exportDate: string
  appVersion: string
  encrypted: boolean
  data: unknown
  encryption?: {
    algorithm: string
    kdf: string
    salt: string
    iv: string
  }
}

/**
 * Default security settings
 */
export const defaultSecuritySettings: SecuritySettings = {
  passwordEnabled: false,
  passwordHash: null,
  sessionTimeoutMinutes: 15,
  sessionTimeoutEnabled: false,
  storageLocation: 'localStorage',
  lastActivity: null,
  biometricEnabled: false,
  biometricCredentialId: null,
  passwordRecoveryEnabled: false,
  securityQuestions: null
}

/**
 * Default lock state
 */
export const defaultLockState: LockState = {
  isLocked: false,
  failedAttempts: 0,
  lockoutUntil: null
}

// NOTE: The following were removed as dead code during cleanup:
// - isEncryptedState: Type guard that was never called
// - createExportData: Helper function that was never used
// See .amp/plans/fix-encryption/AUDIT_FINDINGS.md for details
