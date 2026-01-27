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
  defaultLockState,
  isEncryptedState,
  createExportData
} from './types'

export type {
  SecuritySettings,
  SessionTimeoutMinutes,
  StorageLocation,
  LockState,
  EncryptedStateWrapper,
  ExportedData,
  EncryptedData
} from './types'

export {
  createSecurityTransform,
  createSensitiveFieldsTransform,
  setSessionPassword,
  clearSessionPassword,
  hasSessionPassword,
  getSessionPassword
} from './transform'

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
