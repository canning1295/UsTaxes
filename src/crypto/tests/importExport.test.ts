/**
 * Tests for import/export functionality
 */

import {
  exportEncrypted,
  exportPlain,
  importData,
  validateExportFile,
  generateExportFilename,
  EXPORT_VERSION
} from '../importExport'
import { ExportedData } from '../types'

describe('Import/Export functionality', () => {
  const sampleTaxData = {
    Y2024: {
      taxPayer: {
        primaryPerson: {
          firstName: 'Jane',
          lastName: 'Smith',
          ssid: '987-65-4321'
        }
      },
      w2s: [
        {
          employer: 'Acme Corp',
          income: 75000,
          withholding: 15000
        }
      ]
    }
  }

  describe('exportPlain', () => {
    it('should create valid export structure', () => {
      const exported = exportPlain(sampleTaxData)

      expect(exported.version).toBe(EXPORT_VERSION)
      expect(exported.encrypted).toBe(false)
      expect(exported.data).toEqual(sampleTaxData)
      expect(exported.exportDate).toBeDefined()
      expect(exported.appVersion).toBeDefined()
      expect(exported.encryption).toBeUndefined()
    })

    it('should include export date as ISO string', () => {
      const exported = exportPlain(sampleTaxData)
      const date = new Date(exported.exportDate)
      expect(date).toBeInstanceOf(Date)
      expect(isNaN(date.getTime())).toBe(false)
    })
  })

  describe('exportEncrypted', () => {
    const password = 'testPassword123'

    it('should create encrypted export structure', async () => {
      const exported = await exportEncrypted(sampleTaxData, password)

      expect(exported.version).toBe(EXPORT_VERSION)
      expect(exported.encrypted).toBe(true)
      expect(typeof exported.data).toBe('string')
      expect(exported.encryption).toBeDefined()
      expect(exported.encryption?.algorithm).toBe('AES-GCM-256')
      expect(exported.encryption?.kdf).toBe('PBKDF2-SHA256-100000')
      expect(exported.encryption?.salt).toBeDefined()
      expect(exported.encryption?.iv).toBeDefined()
    })

    it('should not contain plaintext sensitive data', async () => {
      const exported = await exportEncrypted(sampleTaxData, password)
      const jsonString = JSON.stringify(exported)

      expect(jsonString).not.toContain('987-65-4321')
      expect(jsonString).not.toContain('Jane')
      expect(jsonString).not.toContain('Acme Corp')
    })
  })

  describe('importData', () => {
    describe('plain import', () => {
      it('should import unencrypted data', async () => {
        const exported = exportPlain(sampleTaxData)
        const imported = await importData(exported)

        expect(imported).toEqual(sampleTaxData)
      })
    })

    describe('encrypted import', () => {
      const password = 'importPassword!'

      it('should import encrypted data with correct password', async () => {
        const exported = await exportEncrypted(sampleTaxData, password)
        const imported = await importData(exported, password)

        expect(imported).toEqual(sampleTaxData)
      })

      it('should fail with incorrect password', async () => {
        const exported = await exportEncrypted(sampleTaxData, password)

        await expect(importData(exported, 'wrongPassword')).rejects.toThrow()
      })

      it('should fail if password not provided for encrypted data', async () => {
        const exported = await exportEncrypted(sampleTaxData, password)

        await expect(importData(exported)).rejects.toThrow(
          'Password required for encrypted export'
        )
      })
    })
  })

  describe('validateExportFile', () => {
    it('should validate correct export structure', () => {
      const validExport: ExportedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appVersion: '0.1.23',
        encrypted: false,
        data: { test: 'data' }
      }

      expect(validateExportFile(validExport)).toBe(true)
    })

    it('should reject non-object data', () => {
      expect(() => validateExportFile(null)).toThrow('not an object')
      expect(() => validateExportFile('string')).toThrow('not an object')
      expect(() => validateExportFile(123)).toThrow('not an object')
    })

    it('should reject missing version', () => {
      expect(() => validateExportFile({ encrypted: false, data: {} })).toThrow(
        'missing or invalid version'
      )
    })

    it('should reject missing encrypted flag', () => {
      expect(() => validateExportFile({ version: '1.0', data: {} })).toThrow(
        'missing encrypted flag'
      )
    })

    it('should reject encrypted file without encryption metadata', () => {
      expect(() =>
        validateExportFile({
          version: '1.0',
          encrypted: true,
          data: 'encrypted'
        })
      ).toThrow('missing encryption metadata')
    })
  })

  describe('generateExportFilename', () => {
    it('should generate filename with tax year', () => {
      const filename = generateExportFilename('Y2024')
      expect(filename).toContain('ustaxes')
      expect(filename).toContain('Y2024')
    })

    it('should generate filename without tax year', () => {
      const filename = generateExportFilename()
      expect(filename).toContain('ustaxes')
      expect(filename).toContain('all')
    })

    it('should include date in filename', () => {
      const today = new Date().toISOString().split('T')[0]
      const filename = generateExportFilename()
      expect(filename).toContain(today)
    })
  })
})

describe('Round-trip encryption tests', () => {
  const password = 'roundTripPassword!'

  it('should preserve all data types through encryption', async () => {
    const complexData = {
      string: 'hello',
      number: 42,
      float: 3.14159,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: {
        deep: {
          value: 'deep value'
        }
      }
    }

    const exported = await exportEncrypted(complexData, password)
    const imported = await importData(exported, password)

    expect(imported).toEqual(complexData)
  })

  it('should handle empty objects', async () => {
    const emptyData = {}
    const exported = await exportEncrypted(emptyData, password)
    const imported = await importData(exported, password)

    expect(imported).toEqual(emptyData)
  })

  it('should handle arrays at root level', async () => {
    const arrayData = [1, 2, 3, { nested: true }]
    const exported = await exportEncrypted(arrayData, password)
    const imported = await importData(exported, password)

    expect(imported).toEqual(arrayData)
  })
})
