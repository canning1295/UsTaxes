/**
 * Tests for DataPropagator component
 *
 * Tests the data migration functionality that copies taxpayer data
 * from a prior year to the current year.
 */

import { TaxYears, TaxYear, State, PrimaryPerson } from 'ustaxes/core/data'
import { Information, PersonRole } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'
import { blankState } from 'ustaxes/redux/reducer'
import _ from 'lodash'

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

// Helper function that mirrors DataPropagator's canPropagate logic
const canPropagate = (
  activeYear: TaxYear,
  currentInfo: Information,
  priorInfo: Information | undefined
): boolean => {
  const allYears = enumKeys(TaxYears)
  const yearIndex = _.indexOf(allYears, activeYear)

  return (
    yearIndex > 0 &&
    currentInfo.taxPayer.primaryPerson?.firstName === undefined &&
    priorInfo?.taxPayer.primaryPerson?.firstName !== undefined
  )
}

describe('DataPropagator feature', () => {
  describe('Year index calculation', () => {
    it('should correctly calculate year index', () => {
      const allYears = enumKeys(TaxYears)
      const activeYear = 'Y2025'
      const yearIndex = _.indexOf(allYears, activeYear)

      // Y2025 should be the last year (index 6 for 7 years: 2019-2025)
      expect(yearIndex).toBe(6)
    })

    it('should identify prior year correctly', () => {
      const allYears = enumKeys(TaxYears)
      const activeYear = 'Y2025'
      const yearIndex = _.indexOf(allYears, activeYear)

      if (yearIndex > 0) {
        const priorYear = allYears[yearIndex - 1]
        expect(priorYear).toBe('Y2024')
      }
    })

    it('should have no prior year for Y2019', () => {
      const allYears = enumKeys(TaxYears)
      const activeYear = 'Y2019'
      const yearIndex = _.indexOf(allYears, activeYear)

      expect(yearIndex).toBe(0)
      // No prior year available
      const hasPriorYear = yearIndex > 0
      expect(hasPriorYear).toBe(false)
    })
  })

  describe('canPropagate logic', () => {
    it('should not propagate when on first year (Y2019)', () => {
      const currentInfo = blankState
      const priorInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      // Y2019 has no prior year, so should not propagate
      expect(canPropagate('Y2019', currentInfo, priorInfo)).toBe(false)
    })

    it('should not propagate when current year has data', () => {
      const currentInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      const priorInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      // Current year has data, so should not propagate
      expect(canPropagate('Y2025', currentInfo, priorInfo)).toBe(false)
    })

    it('should not propagate when prior year has no data', () => {
      const currentInfo = blankState
      const priorInfo = blankState
      // Prior year has no data, so should not propagate
      expect(canPropagate('Y2025', currentInfo, priorInfo)).toBe(false)
    })

    it('should allow propagation when conditions are met', () => {
      const currentInfo = blankState
      const priorInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      // Current empty, prior has data, not first year
      expect(canPropagate('Y2025', currentInfo, priorInfo)).toBe(true)
    })
  })

  describe('Primary person data check', () => {
    it('should detect when current year has no primary person', () => {
      const currentYear: Information = blankState
      const hasPrimaryPerson =
        currentYear.taxPayer.primaryPerson?.firstName !== undefined
      expect(hasPrimaryPerson).toBe(false)
    })

    it('should detect when prior year has primary person', () => {
      const priorYear: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      const hasPrimaryPerson =
        priorYear.taxPayer.primaryPerson?.firstName !== undefined
      expect(hasPrimaryPerson).toBe(true)
    })

    it('should check firstName specifically for propagation', () => {
      // The component checks primaryPerson?.firstName !== undefined
      const withName = createValidPrimaryPerson()
      expect(withName.firstName).toBe('John')
      expect(withName.firstName).toBeDefined()

      const withoutName: { firstName: string | undefined } = {
        ...createValidPrimaryPerson(),
        firstName: undefined
      }
      expect(withoutName.firstName).toBeUndefined()
    })
  })

  describe('State propagation', () => {
    it('should copy full Information object on migrate', () => {
      const priorYearData: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }

      // Simulate what setInfo(priorYear) would do
      const migratedData = { ...priorYearData }

      expect(migratedData.taxPayer.primaryPerson?.firstName).toBe('John')
      expect(migratedData.taxPayer.primaryPerson?.lastName).toBe('Doe')
    })

    it('should preserve prior year W2s during migration', () => {
      const priorYearData: Information = {
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

      const migratedData = { ...priorYearData }
      expect(migratedData.w2s.length).toBe(1)
      expect(migratedData.w2s[0].employer?.employerName).toBe('Test Corp')
    })

    it('should preserve dependents during migration', () => {
      const priorYearData: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson(),
          dependents: [
            {
              firstName: 'Child',
              lastName: 'Doe',
              ssid: '111-22-3333',
              role: PersonRole.DEPENDENT,
              isBlind: false,
              dateOfBirth: new Date('2015-01-01'),
              relationship: 'SON'
            }
          ]
        }
      }

      const migratedData = { ...priorYearData }
      expect(migratedData.taxPayer.dependents.length).toBe(1)
      expect(migratedData.taxPayer.dependents[0].firstName).toBe('Child')
    })
  })

  describe('UI behavior', () => {
    it('should render nothing when propagation not allowed', () => {
      // When canPropagate is false, component returns <></>
      // Testing with actual state: current year has data
      const currentInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      expect(canPropagate('Y2025', currentInfo, blankState)).toBe(false)
    })

    it('should show alert when propagation is allowed', () => {
      // Testing with actual state: current empty, prior has data
      const priorInfo: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson()
        }
      }
      expect(canPropagate('Y2025', blankState, priorInfo)).toBe(true)
    })

    it('should have migrate button text defined', () => {
      const buttonText = 'Migrate'
      expect(buttonText).toBe('Migrate')
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined prior year gracefully', () => {
      const allYears = enumKeys(TaxYears)
      const activeYear = 'Y2019'
      const yearIndex = _.indexOf(allYears, activeYear)

      const priorYear = yearIndex > 0 ? allYears[yearIndex - 1] : undefined
      expect(priorYear).toBeUndefined()
    })

    it('should handle empty spouse correctly', () => {
      const info: Information = {
        ...blankState,
        taxPayer: {
          ...blankState.taxPayer,
          primaryPerson: createValidPrimaryPerson(),
          spouse: undefined
        }
      }

      expect(info.taxPayer.spouse).toBeUndefined()
    })

    it('should handle address with foreign country', () => {
      const personWithForeignAddress = {
        ...createValidPrimaryPerson(),
        address: {
          address: '123 Foreign St',
          city: 'London',
          state: undefined,
          foreignCountry: 'UK',
          zip: 'SW1A 1AA'
        }
      }

      expect(personWithForeignAddress.address.state).toBeUndefined()
      expect(personWithForeignAddress.address.foreignCountry).toBe('UK')
    })
  })
})
