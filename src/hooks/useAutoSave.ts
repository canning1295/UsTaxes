import { useEffect, useRef, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { FieldValues, UseFormWatch } from 'react-hook-form'
import { debounce } from 'lodash'
import { YearsTaxesState } from 'ustaxes/redux/data'

interface UseAutoSaveOptions<T extends FieldValues> {
  watch: UseFormWatch<T>
  onSave: (data: T) => void
  debounceMs?: number
  /** Optional validation function - only auto-saves if this returns true */
  canSave?: (data: T) => boolean
}

/**
 * Custom hook that automatically saves form data when:
 * 1. Auto-save is enabled in settings
 * 2. Form values change
 * 3. Optional validation function returns true
 *
 * Note: Additional validation should be done in the onSave callback if needed
 */
export function useAutoSave<T extends FieldValues>({
  watch,
  onSave,
  debounceMs = 1000,
  canSave = () => true
}: UseAutoSaveOptions<T>): void {
  const autoSaveEnabled = useSelector(
    (state: YearsTaxesState) => state.appSettings.autoSaveEnabled ?? false
  )

  // Use ref to track if we've already saved
  const lastSavedRef = useRef<string>('')
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const canSaveRef = useRef(canSave)
  canSaveRef.current = canSave

  const debouncedSave = useMemo(
    () =>
      debounce((data: T) => {
        // Check if data is valid before saving
        if (!canSaveRef.current(data)) {
          return
        }
        const serialized = JSON.stringify(data)
        if (serialized !== lastSavedRef.current) {
          lastSavedRef.current = serialized
          try {
            onSaveRef.current(data)
          } catch (e) {
            // Silently ignore validation errors during auto-save
            console.debug('Auto-save skipped due to validation error:', e)
          }
        }
      }, debounceMs),
    [debounceMs]
  )

  useEffect(() => {
    if (!autoSaveEnabled) {
      return
    }

    // Watch all form values
    const subscription = watch((data) => {
      debouncedSave(data as T)
    })

    return () => {
      subscription.unsubscribe()
      debouncedSave.cancel()
    }
  }, [autoSaveEnabled, watch, debouncedSave])
}
