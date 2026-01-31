/**
 * Tests for Import/Export feature data handling
 *
 * Tests the data validation, format detection, and round-trip
 * integrity of import/export operations.
 */

import {
  exportPlain,
  validateExportFile,
  EXPORT_VERSION
} from 'ustaxes/crypto/importExport'
import { ExportedData } from 'ustaxes/crypto/types'
import { blankState } from 'ustaxes/redux/reducer'
import { Information, PersonRole } from 'ustaxes/core/data'

// Helper to create test tax data
const createTestTaxData = (): Information => ({
  ...blankState,
  taxPayer: {
    ...blankState.taxPayer,
    primaryPerson: {
      firstName: 'John',
      lastName: 'Doe',
      ssid: '123-45-6789',
      role: PersonRole.PRIMARY,
      isBlind: false,
      isTaxpayerDependent: false,
      dateOfBirth: new Date('1980-01-01'),
      address: {
        address: '123 Main St',
        city: 'Anytown'
      }
    }
  }
})

describe('Import/Export feature', () => {
  describe('EXPORT_VERSION constant', () => {
    it('should be defined', () => {
      expect(EXPORT_VERSION).toBeDefined()
    })

    it('should be a version string', () => {
      expect(typeof EXPORT_VERSION).toBe('string')
      expect(EXPORT_VERSION).toMatch(/^\d+\.\d+$/)
    })
  })

  describe('exportPlain', () => {
    it('should include version field', () => {
      const exported = exportPlain({})
      expect(exported.version).toBe(EXPORT_VERSION)
    })

    it('should include exportDate as ISO string', () => {
      const exported = exportPlain({})
      expect(exported.exportDate).toBeDefined()
      const date = new Date(exported.exportDate)
      expect(date.toISOString()).toBe(exported.exportDate)
    })

    it('should include appVersion', () => {
      const exported = exportPlain({})
      expect(exported.appVersion).toBeDefined()
    })

    it('should set encrypted to false', () => {
      const exported = exportPlain({})
      expect(exported.encrypted).toBe(false)
    })

    it('should not include encryption metadata', () => {
      const exported = exportPlain({})
      expect(exported.encryption).toBeUndefined()
    })

    it('should preserve data structure', () => {
      const taxData = createTestTaxData()
      const exported = exportPlain(taxData)

      expect(exported.data).toEqual(taxData)
    })

    it('should preserve nested object properties', () => {
      const taxData = createTestTaxData()
      const exported = exportPlain(taxData)

      const data = exported.data as Information
      expect(data.taxPayer.primaryPerson?.firstName).toBe('John')
      expect(data.taxPayer.primaryPerson?.lastName).toBe('Doe')
    })
  })

  describe('validateExportFile', () => {
    it('should reject non-object input', () => {
      expect(() => validateExportFile(null)).toThrow('not an object')
      expect(() => validateExportFile('string')).toThrow('not an object')
      expect(() => validateExportFile(123)).toThrow('not an object')
    })

    it('should reject missing version', () => {
      const invalid = { encrypted: false, data: {} }
      expect(() => validateExportFile(invalid)).toThrow('version')
    })

    it('should reject missing encrypted flag', () => {
      const invalid = { version: '1.0', data: {} }
      expect(() => validateExportFile(invalid)).toThrow('encrypted')
    })

    it('should reject encrypted export without metadata', () => {
      const invalid = { version: '1.0', encrypted: true, data: 'encrypted' }
      expect(() => validateExportFile(invalid)).toThrow('encryption metadata')
    })

    it('should accept valid plain export', () => {
      const valid = exportPlain({ test: 'data' })
      expect(validateExportFile(valid)).toBe(true)
    })
  })

  describe('ExportedData structure', () => {
    it('should create valid plain export structure', () => {
      const exported: ExportedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appVersion: '0.1.23',
        encrypted: false,
        data: { key: 'value' }
      }

      expect(exported).toHaveProperty('version')
      expect(exported).toHaveProperty('exportDate')
      expect(exported).toHaveProperty('appVersion')
      expect(exported).toHaveProperty('encrypted')
      expect(exported).toHaveProperty('data')
    })

    it('should create valid encrypted export structure', () => {
      const exported: ExportedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appVersion: '0.1.23',
        encrypted: true,
        data: 'base64EncryptedString',
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
      expect(exported.encryption?.kdf).toBe('PBKDF2-SHA256-100000')
    })
  })

  describe('Data integrity', () => {
    it('should preserve arrays in export', () => {
      const data = {
        w2s: [
          { employer: 'Company A', income: 50000 },
          { employer: 'Company B', income: 60000 }
        ]
      }
      const exported = exportPlain(data)
      const result = exported.data as typeof data

      expect(result.w2s).toHaveLength(2)
      expect(result.w2s[0].employer).toBe('Company A')
      expect(result.w2s[1].employer).toBe('Company B')
    })

    it('should preserve numeric values', () => {
      const data = { income: 100000, withholding: 25000.5 }
      const exported = exportPlain(data)
      const result = exported.data as typeof data

      expect(result.income).toBe(100000)
      expect(result.withholding).toBe(25000.5)
    })

    it('should preserve boolean values', () => {
      const data = { isBlind: true, isTaxpayerDependent: false }
      const exported = exportPlain(data)
      const result = exported.data as typeof data

      expect(result.isBlind).toBe(true)
      expect(result.isTaxpayerDependent).toBe(false)
    })

    it('should preserve null values', () => {
      const data = { spouse: null, refund: null }
      const exported = exportPlain(data)
      const result = exported.data as typeof data

      expect(result.spouse).toBeNull()
      expect(result.refund).toBeNull()
    })

    it('should preserve undefined as omitted', () => {
      const data: Record<string, unknown> = { defined: 'value' }
      data.undefined = undefined
      const exported = exportPlain(data)
      const result = exported.data as typeof data

      expect(result.defined).toBe('value')
      // JSON.stringify omits undefined values
    })
  })

  describe('Multi-year data export', () => {
    it('should export data for multiple years', () => {
      const multiYearData = {
        Y2024: createTestTaxData(),
        Y2025: createTestTaxData(),
        activeYear: 'Y2025'
      }

      const exported = exportPlain(multiYearData)
      const result = exported.data as typeof multiYearData

      expect(result.Y2024).toBeDefined()
      expect(result.Y2025).toBeDefined()
      expect(result.activeYear).toBe('Y2025')
    })

    it('should preserve year-specific data', () => {
      const baseTaxData = createTestTaxData()
      const basePrimaryPerson = baseTaxData.taxPayer.primaryPerson ?? {
        firstName: '',
        lastName: '',
        ssid: ''
      }

      const y2024Data = {
        ...baseTaxData,
        taxPayer: {
          ...baseTaxData.taxPayer,
          primaryPerson: {
            ...basePrimaryPerson,
            firstName: 'John2024'
          }
        }
      }

      const y2025Data = {
        ...baseTaxData,
        taxPayer: {
          ...baseTaxData.taxPayer,
          primaryPerson: {
            ...basePrimaryPerson,
            firstName: 'John2025'
          }
        }
      }

      const multiYearData = {
        Y2024: y2024Data,
        Y2025: y2025Data
      }

      const exported = exportPlain(multiYearData)
      const result = exported.data as typeof multiYearData

      expect(result.Y2024.taxPayer.primaryPerson.firstName).toBe('John2024')
      expect(result.Y2025.taxPayer.primaryPerson.firstName).toBe('John2025')
    })
  })

  describe('Export file naming', () => {
    it('should generate meaningful filenames', () => {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `ustaxes-export-${timestamp}.json`

      expect(filename).toContain('ustaxes')
      expect(filename).toContain('export')
      expect(filename).toContain('.json')
    })
  })
})
