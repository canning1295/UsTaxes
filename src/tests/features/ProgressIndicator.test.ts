/**
 * Tests for ProgressIndicator feature
 *
 * Tests the useProgress hook and calculateProgress function which track
 * form completion status across all sections.
 */

import { calculateProgress, ProgressSummary } from 'ustaxes/hooks/useProgress'
import {
  Information,
  PersonRole,
  AccountType,
  State,
  PrimaryPerson,
  IncomeW2,
  Refund
} from 'ustaxes/core/data'
import { blankState } from 'ustaxes/redux/reducer'

// Helper to create a valid primary person
const createValidPrimaryPerson = (): PrimaryPerson<Date> => ({
  firstName: 'John',
  lastName: 'Doe',
  ssid: '123-45-6789',
  role: PersonRole.PRIMARY,
  isBlind: false,
  isTaxpayerDependent: false,
  dateOfBirth: new Date('1980-01-01'),
  address: {
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA' as State,
    zip: '12345'
  }
})

// Helper to create valid W2
const createValidW2 = (): IncomeW2 => ({
  employer: { EIN: '12-3456789', employerName: 'Test Corp' },
  occupation: 'Engineer',
  income: 100000,
  medicareIncome: 100000,
  fedWithholding: 20000,
  ssWages: 100000,
  ssWithholding: 6200,
  medicareWithholding: 1450,
  personRole: PersonRole.PRIMARY
})

// Helper to create valid refund info
const createValidRefund = (): Refund => ({
  routingNumber: '123456789',
  accountNumber: '987654321',
  accountType: AccountType.checking
})

describe('ProgressIndicator feature', () => {
  describe('calculateProgress', () => {
    it('should return 0% for blank state', () => {
      const result = calculateProgress(blankState)
      expect(result.overallPercentage).toBe(0)
      expect(result.completedCount).toBe(0)
    })

    it('should return expected total section count', () => {
      const result = calculateProgress(blankState)
      // Should have 15 sections as defined in useProgress.ts
      expect(result.totalCount).toBe(15)
    })

    it('should include all expected sections', () => {
      const result = calculateProgress(blankState)
      const sectionIds = result.sections.map((s) => s.id)

      expect(sectionIds).toContain('primary-taxpayer')
      expect(sectionIds).toContain('spouse-dependents')
      expect(sectionIds).toContain('w2s')
      expect(sectionIds).toContain('f1099s')
      expect(sectionIds).toContain('real-estate')
      expect(sectionIds).toContain('other-investments')
      expect(sectionIds).toContain('stock-options')
      expect(sectionIds).toContain('partnership-income')
      expect(sectionIds).toContain('estimated-taxes')
      expect(sectionIds).toContain('student-loans')
      expect(sectionIds).toContain('itemized-deductions')
      expect(sectionIds).toContain('hsa')
      expect(sectionIds).toContain('ira')
      expect(sectionIds).toContain('questions')
      expect(sectionIds).toContain('refund')
    })
  })

  describe('Primary Taxpayer section status', () => {
    it('should be not-started when no primary person', () => {
      const result = calculateProgress(blankState)
      const section = result.sections.find((s) => s.id === 'primary-taxpayer')
      expect(section?.status).toBe('not-started')
    })

    it('should be in-progress when primary person has partial data', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: {
            firstName: 'John',
            lastName: '',
            ssid: '',
            role: PersonRole.PRIMARY,
            isBlind: false,
            isTaxpayerDependent: false,
            dateOfBirth: new Date('1980-01-01'),
            address: {
              address: '',
              city: '',
              state: undefined
            }
          }
        }
      }
      const result = calculateProgress(info)
      const section = result.sections.find((s) => s.id === 'primary-taxpayer')
      expect(section?.status).toBe('in-progress')
    })

    it('should be complete when primary person has all required fields', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      const result = calculateProgress(info)
      const section = result.sections.find((s) => s.id === 'primary-taxpayer')
      expect(section?.status).toBe('complete')
    })
  })

  describe('W2 section status', () => {
    it('should be not-started when no W2s', () => {
      const result = calculateProgress(blankState)
      const section = result.sections.find((s) => s.id === 'w2s')
      expect(section?.status).toBe('not-started')
      expect(section?.itemCount).toBe(0)
    })

    it('should be complete when W2 is valid', () => {
      const info: Information = {
        ...blankState,
        w2s: [createValidW2()]
      }
      const result = calculateProgress(info)
      const section = result.sections.find((s) => s.id === 'w2s')
      expect(section?.status).toBe('complete')
      expect(section?.itemCount).toBe(1)
    })

    it('should track item count correctly', () => {
      const info: Information = {
        ...blankState,
        w2s: [createValidW2(), createValidW2(), createValidW2()]
      }
      const result = calculateProgress(info)
      const section = result.sections.find((s) => s.id === 'w2s')
      expect(section?.itemCount).toBe(3)
    })
  })

  describe('Refund section status', () => {
    it('should be not-started when no refund info', () => {
      const result = calculateProgress(blankState)
      const section = result.sections.find((s) => s.id === 'refund')
      expect(section?.status).toBe('not-started')
    })

    it('should be complete when refund has all required fields', () => {
      const info: Information = {
        ...blankState,
        refund: createValidRefund()
      }
      const result = calculateProgress(info)
      const section = result.sections.find((s) => s.id === 'refund')
      expect(section?.status).toBe('complete')
    })
  })

  describe('Overall percentage calculation', () => {
    it('should calculate percentage based on complete sections', () => {
      // With 15 sections, 1 complete = ~7%
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      const result = calculateProgress(info)
      expect(result.completedCount).toBe(1)
      expect(result.overallPercentage).toBe(Math.round((1 / 15) * 100))
    })

    it('should increase percentage as more sections complete', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        },
        w2s: [createValidW2()],
        refund: createValidRefund()
      }
      const result = calculateProgress(info)
      expect(result.completedCount).toBeGreaterThan(1)
      expect(result.overallPercentage).toBeGreaterThan(6)
    })
  })

  describe('SectionProgress interface', () => {
    it('should have correct structure', () => {
      const result = calculateProgress(blankState)
      const section = result.sections[0]

      expect(section).toHaveProperty('id')
      expect(section).toHaveProperty('label')
      expect(section).toHaveProperty('status')
      expect(typeof section.id).toBe('string')
      expect(typeof section.label).toBe('string')
      expect(['not-started', 'in-progress', 'complete']).toContain(
        section.status
      )
    })
  })

  describe('ProgressSummary interface', () => {
    it('should have correct structure', () => {
      const result: ProgressSummary = calculateProgress(blankState)

      expect(result).toHaveProperty('sections')
      expect(result).toHaveProperty('completedCount')
      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('overallPercentage')
      expect(Array.isArray(result.sections)).toBe(true)
      expect(typeof result.completedCount).toBe('number')
      expect(typeof result.totalCount).toBe('number')
      expect(typeof result.overallPercentage).toBe('number')
    })
  })

  describe('Year-specific asset filtering', () => {
    it('should only count assets sold in the active year', () => {
      const assets = [
        {
          name: 'Stock A',
          openDate: new Date('2024-01-01'),
          closeDate: new Date('2025-06-15'), // Sold in 2025
          openPrice: 100,
          closePrice: 150,
          openFee: 0,
          closeFee: 0,
          quantity: 10,
          positionType: 'Security' as const
        },
        {
          name: 'Stock B',
          openDate: new Date('2023-01-01'),
          closeDate: new Date('2024-12-01'), // Sold in 2024, should not count
          openPrice: 50,
          closePrice: 75,
          openFee: 0,
          closeFee: 0,
          quantity: 20,
          positionType: 'Security' as const
        }
      ]

      const result = calculateProgress(blankState, assets, 'Y2025')
      const section = result.sections.find((s) => s.id === 'other-investments')

      // Only the 2025 asset should be counted
      expect(section?.itemCount).toBe(1)
    })

    it('should handle empty assets array', () => {
      const result = calculateProgress(blankState, [], 'Y2025')
      const section = result.sections.find((s) => s.id === 'other-investments')
      expect(section?.status).toBe('not-started')
      expect(section?.itemCount).toBe(0)
    })
  })
})
