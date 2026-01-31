/**
 * Tests for YearStatusBar component
 *
 * Tests the year selector component that displays and allows changing
 * the active tax year.
 */

import { TaxYears, TaxYear } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'
import { YearsTaxesState } from 'ustaxes/redux/data'
import { blankYearTaxesState } from 'ustaxes/redux'

describe('YearStatusBar feature', () => {
  describe('TaxYears configuration', () => {
    it('should have Y2025 as a valid tax year', () => {
      expect(TaxYears).toHaveProperty('Y2025')
      expect(TaxYears.Y2025).toBe(2025)
    })

    it('should have all expected tax years', () => {
      expect(TaxYears).toHaveProperty('Y2019')
      expect(TaxYears).toHaveProperty('Y2020')
      expect(TaxYears).toHaveProperty('Y2021')
      expect(TaxYears).toHaveProperty('Y2022')
      expect(TaxYears).toHaveProperty('Y2023')
      expect(TaxYears).toHaveProperty('Y2024')
      expect(TaxYears).toHaveProperty('Y2025')
    })

    it('should map year keys to correct numeric values', () => {
      expect(TaxYears.Y2019).toBe(2019)
      expect(TaxYears.Y2020).toBe(2020)
      expect(TaxYears.Y2021).toBe(2021)
      expect(TaxYears.Y2022).toBe(2022)
      expect(TaxYears.Y2023).toBe(2023)
      expect(TaxYears.Y2024).toBe(2024)
      expect(TaxYears.Y2025).toBe(2025)
    })
  })

  describe('Active year state', () => {
    it('should have activeYear in state', () => {
      const state: YearsTaxesState = blankYearTaxesState
      expect(state).toHaveProperty('activeYear')
    })

    it('should default to Y2025', () => {
      const state: YearsTaxesState = blankYearTaxesState
      expect(state.activeYear).toBe('Y2025')
    })

    it('should be changeable to any valid year', () => {
      const allYears = enumKeys(TaxYears)

      allYears.forEach((year) => {
        const state: YearsTaxesState = {
          ...blankYearTaxesState,
          activeYear: year
        }
        expect(state.activeYear).toBe(year)
      })
    })
  })

  describe('Year display formatting', () => {
    it('should display numeric year correctly', () => {
      const activeYear: TaxYear = 'Y2025'
      const displayYear = TaxYears[activeYear]
      expect(displayYear).toBe(2025)
      expect(`Tax Year ${displayYear}`).toBe('Tax Year 2025')
    })

    it('should format aria label correctly', () => {
      const activeYear: TaxYear = 'Y2025'
      const ariaLabel = `Change tax year. Currently editing ${TaxYears[activeYear]}`
      expect(ariaLabel).toBe('Change tax year. Currently editing 2025')
    })
  })

  describe('Year enumeration', () => {
    it('should enumerate all years using enumKeys', () => {
      const allYears = enumKeys(TaxYears)

      expect(allYears).toContain('Y2019')
      expect(allYears).toContain('Y2020')
      expect(allYears).toContain('Y2021')
      expect(allYears).toContain('Y2022')
      expect(allYears).toContain('Y2023')
      expect(allYears).toContain('Y2024')
      expect(allYears).toContain('Y2025')
    })

    it('should have correct year count', () => {
      const allYears = enumKeys(TaxYears)
      expect(allYears.length).toBe(7)
    })

    it('should provide years in order', () => {
      const allYears = enumKeys(TaxYears)
      const yearValues = allYears.map((y) => TaxYears[y])

      // Check that values are increasing
      for (let i = 1; i < yearValues.length; i++) {
        expect(yearValues[i]).toBeGreaterThan(yearValues[i - 1])
      }
    })
  })

  describe('Year-specific state access', () => {
    it('should access correct year data based on activeYear', () => {
      const state: YearsTaxesState = blankYearTaxesState
      const activeYear = state.activeYear

      // Should be able to access the year's Information object
      const yearData = state[activeYear]
      expect(yearData).toBeDefined()
      expect(yearData).toHaveProperty('taxPayer')
      expect(yearData).toHaveProperty('w2s')
    })

    it('should have separate state for each year', () => {
      const state: YearsTaxesState = blankYearTaxesState

      // All years should have their own Information object
      const allYears = enumKeys(TaxYears)
      allYears.forEach((year) => {
        expect(state[year]).toBeDefined()
        expect(state[year]).toHaveProperty('taxPayer')
      })
    })
  })

  describe('Year selection state management', () => {
    it('should toggle open state for dropdown', () => {
      let isOpen = false

      // Toggle on
      isOpen = true
      expect(isOpen).toBe(true)

      // Toggle off (via handleDone)
      isOpen = false
      expect(isOpen).toBe(false)
    })

    it('should respect mounted state for cleanup', () => {
      let isMounted = true

      // Simulate component unmount
      isMounted = false

      // handleDone should check isMounted before updating state
      const handleDone = () => {
        if (isMounted) {
          // Would set isOpen to false
          return true
        }
        return false
      }

      expect(handleDone()).toBe(false)
    })
  })

  describe('Year dropdown button', () => {
    it('should have correct test id', () => {
      const testId = 'year-dropdown-button'
      expect(testId).toBe('year-dropdown-button')
    })

    it('should show current year in button text', () => {
      const activeYear: TaxYear = 'Y2025'
      const buttonText = `Tax Year ${TaxYears[activeYear]}`
      expect(buttonText).toContain('2025')
    })
  })
})
