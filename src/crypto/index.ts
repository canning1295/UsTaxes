/**
 * Crypto module exports
 */

export {
  encrypt,
  decrypt,
  verifyPassword,
  hashPassword,
  verifyPasswordHash,
  isCryptoAvailable
} from './encrypt'

export {
  defaultSecuritySettings,
  defaultLockState
  // NOTE: isEncryptedState and createExportData removed - they were unused dead code
} from './types'

export type {
  SecuritySettings,
  SessionTimeoutMinutes,
  StorageLocation,
  LockState,
  EncryptedStateWrapper,
  ExportedData,
  EncryptedData,
  SecurityQuestion
} from './types'

export {
  // NOTE: createSecurityTransform and createSensitiveFieldsTransform removed - they were unused dead code
  setSessionPassword,
  clearSessionPassword,
  hasSessionPassword,
  hasSessionPasswordAsync,
  getSessionPassword,
  getSessionCryptoKey,
  setSecureStorageMode
} from './transform'

export {
  isSecureStorageAvailable,
  initializeSession,
  retrieveSessionKey,
  clearSessionKey,
  hasValidSessionKey,
  deriveSessionKey,
  encryptWithSessionKey,
  decryptWithSessionKey
} from './secureKeyStorage'

export {
  exportEncrypted,
  exportPlain,
  importData,
  validateExportFile,
  generateExportFilename,
  downloadAsFile,
  readExportFile,
  EXPORT_VERSION
} from './importExport'

export {
  createEncryptedStorage,
  encryptedStorage,
  encryptAllStorage,
  decryptAllStorage,
  reencryptStorage,
  hasEncryptedData
} from './encryptedStorage'

export {
  hasExistingTaxData,
  hasYearData,
  getDataSummary,
  isDataEncrypted,
  getYearDataSummaries
  // NOTE: isLegacySecurityFormat was removed - the legacy format was never created
} from './utils'

export type { DataSummary, YearDataSummary } from './utils'

export {
  getEncryptionStatus,
  checkLocalStorageEncrypted,
  logEncryptionStatus,
  atomicDisableEncryption,
  atomicEnableEncryption,
  detectAndRecoverInconsistentState
} from './encryptionState'

export type { EncryptionStatus, TransitionResult } from './encryptionState'
