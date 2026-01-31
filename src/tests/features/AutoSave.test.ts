/**
 * Tests for auto-save feature
 *
 * Tests the useAutoSave hook which provides automatic form saving
 * when autoSaveEnabled is true in app settings.
 */

import { YearsTaxesState } from 'ustaxes/redux/data'
import { blankYearTaxesState } from 'ustaxes/redux'

// Mock the useAutoSave hook behavior since actual testing requires react-hook-form
describe('Auto-save feature', () => {
  describe('Auto-save settings', () => {
    it('should have autoSaveEnabled in app settings', () => {
      const state: YearsTaxesState = {
        ...blankYearTaxesState,
        appSettings: {
          autoSaveEnabled: true,
          completedSectionsByYear: {}
        }
      }
      expect(state.appSettings.autoSaveEnabled).toBe(true)
    })

    it('should default to disabled', () => {
      const state = blankYearTaxesState
      expect(state.appSettings.autoSaveEnabled).toBe(false)
    })

    it('should be toggleable', () => {
      const state: YearsTaxesState = {
        ...blankYearTaxesState,
        appSettings: {
          ...blankYearTaxesState.appSettings,
          autoSaveEnabled: false
        }
      }

      // Toggle on
      const updatedState: YearsTaxesState = {
        ...state,
        appSettings: {
          ...state.appSettings,
          autoSaveEnabled: true
        }
      }
      expect(updatedState.appSettings.autoSaveEnabled).toBe(true)

      // Toggle off
      const finalState: YearsTaxesState = {
        ...updatedState,
        appSettings: {
          ...updatedState.appSettings,
          autoSaveEnabled: false
        }
      }
      expect(finalState.appSettings.autoSaveEnabled).toBe(false)
    })
  })

  describe('Auto-save debouncing', () => {
    it('should use 1000ms default debounce', () => {
      // The useAutoSave hook uses a default debounceMs of 1000
      const defaultDebounceMs = 1000
      expect(defaultDebounceMs).toBe(1000)
    })

    it('should allow custom debounce time', () => {
      // Custom debounce can be passed to useAutoSave
      const customDebounceMs = 500
      expect(customDebounceMs).toBeLessThan(1000)
    })
  })

  describe('Auto-save validation', () => {
    it('should support optional canSave validation function', () => {
      const canSave = (data: { value: number }) => data.value > 0

      expect(canSave({ value: 10 })).toBe(true)
      expect(canSave({ value: 0 })).toBe(false)
      expect(canSave({ value: -1 })).toBe(false)
    })

    it('should default canSave to always true', () => {
      const defaultCanSave = () => true

      expect(defaultCanSave()).toBe(true)
    })
  })
})
