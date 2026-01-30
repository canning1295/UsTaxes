/**
 * Import/Export functionality for tax data
 *
 * Provides secure export with optional encryption and
 * import with automatic format detection.
 */

import { encrypt, decrypt } from './encrypt'
import { ExportedData } from './types'

export const EXPORT_VERSION = '1.0'

/**
 * Export data with encryption
 */
export const exportEncrypted = async (
  data: unknown,
  password: string
): Promise<ExportedData> => {
  const encrypted = await encrypt(JSON.stringify(data), password)

  return {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    appVersion: process.env.REACT_APP_VERSION ?? '0.1.23',
    encrypted: true,
    data: encrypted.data,
    encryption: {
      algorithm: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256-100000',
      salt: encrypted.salt,
      iv: encrypted.iv
    }
  }
}

/**
 * Export data without encryption
 */
export const exportPlain = (data: unknown): ExportedData => {
  return {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    appVersion: process.env.REACT_APP_VERSION ?? '0.1.23',
    encrypted: false,
    data
  }
}

/**
 * Import data with automatic encryption detection
 */
export const importData = async (
  exported: ExportedData,
  password?: string
): Promise<unknown> => {
  if (!exported.encrypted) {
    return exported.data
  }

  if (!password) {
    throw new Error('Password required for encrypted export')
  }

  if (!exported.encryption) {
    throw new Error('Missing encryption metadata')
  }

  const encryptedData = {
    version: 1,
    salt: exported.encryption.salt,
    iv: exported.encryption.iv,
    data: exported.data as string
  }

  const decrypted = await decrypt(encryptedData, password)
  return JSON.parse(decrypted) as unknown
}

/**
 * Validate export file structure
 */
export const validateExportFile = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Export file is not an object')
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.version !== 'string') {
    throw new Error('Export file missing or invalid version')
  }

  if (typeof obj.encrypted !== 'boolean') {
    throw new Error('Export file missing encrypted flag')
  }

  if (obj.encrypted && !obj.encryption) {
    throw new Error('Encrypted export missing encryption metadata')
  }

  return true
}

/**
 * Generate filename for export
 */
export const generateExportFilename = (taxYear?: string): string => {
  const date = new Date().toISOString().split('T')[0]
  const yearPart = taxYear ?? 'all'
  return `ustaxes-${yearPart}-${date}.json`
}

/**
 * Download data as file
 */
export const downloadAsFile = (data: ExportedData, filename: string): void => {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Read export file from File object
 */
export const readExportFile = (file: File): Promise<ExportedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const content = reader.result
        if (typeof content !== 'string') {
          throw new Error('Failed to read file')
        }

        const parsed = JSON.parse(content) as unknown
        validateExportFile(parsed)
        resolve(parsed as ExportedData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
