/**
 * Tests for prepopulate feature
 * 
 * Tests the prepopulate functionality which copies taxpayer info
 * from a previous year or export file to a new year.
 */

import { hasYearData, pickPrepopulateFields } from 'ustaxes/data/prepopulate'
import { Information, FilingStatus, PersonRole } from 'ustaxes/core/data'
import { blankState } from 'ustaxes/redux/reducer'

describe('Prepopulate feature', () => {
  describe('hasYearData', () => {
    it('should return false for blank state', () => {
      expect(hasYearData(blankState)).toBe(false)
    })

    it('should return true when primaryPerson exists', () => {
      const info: Information = {
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
            dateOfBirth: new Date('1980-01-01')
          }
        }
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when spouse exists', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          spouse: {
            firstName: 'Jane',
            lastName: 'Doe',
            ssid: '987-65-4321',
            role: PersonRole.SPOUSE,
            isBlind: false,
            isTaxpayerDependent: false,
            dateOfBirth: new Date('1982-01-01')
          }
        }
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when dependents exist', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          dependents: [
            {
              firstName: 'Child',
              lastName: 'Doe',
              ssid: '111-22-3333',
              relationship: 'SON',
              birthYear: 2015,
              numberOfMonths: 12,
              isStudent: false,
              qualifyingInfo: undefined
            }
          ]
        }
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when filingStatus is set', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          filingStatus: FilingStatus.MFJ
        }
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when W2s exist', () => {
      const info: Information = {
        ...blankState,
        w2s: [
          {
            employer: { EIN: '12-3456789', employerName: 'Test Corp' },
            occupation: 'Engineer',
            income: 100000,
            medicareIncome: 100000,
            fedWithholding: 20000,
            ssWages: 100000,
            ssWithholding: 6200,
            medicareWithholding: 1450,
            personRole: PersonRole.PRIMARY,
            state: 'CA',
            stateWages: 100000,
            stateWithholding: 5000
          }
        ]
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when 1099s exist', () => {
      const info: Information = {
        ...blankState,
        f1099s: [
          {
            ppisum: 1000,
            personRole: PersonRole.PRIMARY
          }
        ]
      }
      expect(hasYearData(info)).toBe(true)
    })

    it('should return true when state residencies exist', () => {
      const info: Information = {
        ...blankState,
        stateResidencies: [{ state: 'CA' }]
      }
      expect(hasYearData(info)).toBe(true)
    })
  })

  describe('pickPrepopulateFields', () => {
    it('should copy primary person info', () => {
      const source: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          filingStatus: FilingStatus.S,
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
              city: 'Los Angeles',
              state: 'CA',
              zip: '90001'
            }
          }
        }
      }

      const result = pickPrepopulateFields(source)

      expect(result.taxPayer.primaryPerson?.firstName).toBe('John')
      expect(result.taxPayer.primaryPerson?.lastName).toBe('Doe')
      expect(result.taxPayer.primaryPerson?.address?.city).toBe('Los Angeles')
      expect(result.taxPayer.filingStatus).toBe(FilingStatus.S)
    })

    it('should copy spouse info', () => {
      const source: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          filingStatus: FilingStatus.MFJ,
          spouse: {
            firstName: 'Jane',
            lastName: 'Doe',
            ssid: '987-65-4321',
            role: PersonRole.SPOUSE,
            isBlind: false,
            isTaxpayerDependent: false,
            dateOfBirth: new Date('1982-01-01')
          }
        }
      }

      const result = pickPrepopulateFields(source)

      expect(result.taxPayer.spouse?.firstName).toBe('Jane')
      expect(result.taxPayer.spouse?.lastName).toBe('Doe')
    })

    it('should copy dependents', () => {
      const source: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          dependents: [
            {
              firstName: 'Child1',
              lastName: 'Doe',
              ssid: '111-22-3333',
              relationship: 'SON',
              birthYear: 2015,
              numberOfMonths: 12,
              isStudent: false,
              qualifyingInfo: undefined
            },
            {
              firstName: 'Child2',
              lastName: 'Doe',
              ssid: '222-33-4444',
              relationship: 'DAUGHTER',
              birthYear: 2018,
              numberOfMonths: 12,
              isStudent: false,
              qualifyingInfo: undefined
            }
          ]
        }
      }

      const result = pickPrepopulateFields(source)

      expect(result.taxPayer.dependents).toHaveLength(2)
      expect(result.taxPayer.dependents[0].firstName).toBe('Child1')
      expect(result.taxPayer.dependents[1].firstName).toBe('Child2')
    })

    it('should copy state residencies', () => {
      const source: Information = {
        ...blankState,
        stateResidencies: [{ state: 'CA' }, { state: 'NY' }]
      }

      const result = pickPrepopulateFields(source)

      expect(result.stateResidencies).toHaveLength(2)
      expect(result.stateResidencies[0].state).toBe('CA')
      expect(result.stateResidencies[1].state).toBe('NY')
    })

    it('should NOT copy W2s (year-specific data)', () => {
      const source: Information = {
        ...blankState,
        w2s: [
          {
            employer: { EIN: '12-3456789', employerName: 'Test Corp' },
            occupation: 'Engineer',
            income: 100000,
            medicareIncome: 100000,
            fedWithholding: 20000,
            ssWages: 100000,
            ssWithholding: 6200,
            medicareWithholding: 1450,
            personRole: PersonRole.PRIMARY,
            state: 'CA',
            stateWages: 100000,
            stateWithholding: 5000
          }
        ]
      }

      const result = pickPrepopulateFields(source)

      expect(result.w2s).toHaveLength(0)
    })

    it('should NOT copy 1099s (year-specific data)', () => {
      const source: Information = {
        ...blankState,
        f1099s: [
          {
            ppisum: 1000,
            personRole: PersonRole.PRIMARY
          }
        ]
      }

      const result = pickPrepopulateFields(source)

      expect(result.f1099s).toHaveLength(0)
    })

    it('should copy contact info', () => {
      const source: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          contactEmail: 'john@example.com',
          contactPhoneNumber: '555-123-4567'
        }
      }

      const result = pickPrepopulateFields(source)

      expect(result.taxPayer.contactEmail).toBe('john@example.com')
      expect(result.taxPayer.contactPhoneNumber).toBe('555-123-4567')
    })
  })
})
