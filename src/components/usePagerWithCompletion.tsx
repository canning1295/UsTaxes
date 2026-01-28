import { useState, useCallback, ReactElement } from 'react'
import { useLocation } from 'react-router'
import { useDispatch } from 'ustaxes/redux'
import { useSelector } from 'react-redux'
import { markSectionComplete } from 'ustaxes/redux/actions'
import { YearsTaxesState, SectionId } from 'ustaxes/redux/data'
import { usePager } from './pager'
import { urlToSectionId, useRawProgress } from 'ustaxes/hooks/useProgress'
import CompletionModal from './CompletionModal'

// Friendly names for sections
const sectionNames: Record<SectionId, string> = {
  'primary-taxpayer': 'Personal Information',
  'spouse-dependents': 'Spouse & Dependents',
  w2s: 'W-2 Income',
  f1099s: '1099 Income',
  'real-estate': 'Real Estate',
  'other-investments': 'Other Investments',
  'stock-options': 'Stock Options',
  'partnership-income': 'Partnership Income',
  'estimated-taxes': 'Estimated Taxes',
  'student-loans': 'Student Loan Interest',
  'itemized-deductions': 'Itemized Deductions',
  hsa: 'Health Savings Account',
  ira: 'IRA',
  questions: 'Informational Questions',
  refund: 'Refund Information'
}

interface UsePagerWithCompletionResult {
  navButtons: ReactElement | undefined
  onAdvance: () => void
  completionModal: ReactElement
  showCompletionModal: () => void
}

/**
 * Enhanced pager hook that shows a completion modal when advancing.
 * The modal asks the user if they want to mark the current section as complete.
 *
 * The modal is only shown when:
 * - Section is not already marked complete
 * - All items in the section are valid (no validation errors)
 * - skipModal is not set to true
 *
 * @param skipModal If true, skips showing the modal (useful for intermediate saves)
 */
export function usePagerWithCompletion(
  skipModal = false
): UsePagerWithCompletionResult {
  const { navButtons, onAdvance } = usePager()
  const dispatch = useDispatch()
  const location = useLocation()
  const rawProgress = useRawProgress()

  const [showModal, setShowModal] = useState(false)

  // Get completed sections for the active year (per-year tracking)
  const activeYear = useSelector((state: YearsTaxesState) => state.activeYear)
  const completedSections = useSelector(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (state: YearsTaxesState) =>
      state.appSettings.completedSectionsByYear[activeYear] ?? []
  )

  // Get current section ID from URL (may be undefined if path not in map)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const currentSectionId = urlToSectionId[location.pathname] as
    | SectionId
    | undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const sectionName = currentSectionId
    ? sectionNames[currentSectionId]
    : 'this section'

  // Check if section is already complete
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const isAlreadyComplete = currentSectionId
    ? completedSections.includes(currentSectionId)
    : false

  // Check if section data is valid (no invalid items)
  // Raw progress shows 'complete' if all items are valid, 'not-started' if no items
  // We should show the modal only when data is valid
  const currentSection = rawProgress.sections.find(
    (s) => s.id === currentSectionId
  )
  const sectionDataIsValid =
    !currentSection ||
    currentSection.status === 'complete' ||
    currentSection.status === 'not-started'

  const handleShowModal = useCallback(() => {
    // Only show modal if:
    // - Section is not already complete
    // - Modal is not skipped
    // - Current section exists
    // - Section data is valid (no invalid items)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (
      !skipModal &&
      !isAlreadyComplete &&
      currentSectionId &&
      sectionDataIsValid
    ) {
      setShowModal(true)
    } else {
      // Just advance without showing modal
      onAdvance()
    }
  }, [
    skipModal,
    isAlreadyComplete,
    currentSectionId,
    sectionDataIsValid,
    onAdvance
  ])

  const handleMarkComplete = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (currentSectionId) {
      dispatch(markSectionComplete(currentSectionId))
    }
    setShowModal(false)
    onAdvance()
  }, [currentSectionId, dispatch, onAdvance])

  const handleContinueWithoutMarking = useCallback(() => {
    setShowModal(false)
    onAdvance()
  }, [onAdvance])

  const completionModal = (
    <CompletionModal
      open={showModal}
      sectionName={sectionName}
      onMarkComplete={handleMarkComplete}
      onContinueWithoutMarking={handleContinueWithoutMarking}
    />
  )

  return {
    navButtons,
    onAdvance: handleShowModal,
    completionModal,
    showCompletionModal: handleShowModal
  }
}

export default usePagerWithCompletion
