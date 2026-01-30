import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { YearsTaxesState, SectionId } from 'ustaxes/redux/data'
import {
  Information,
  TaxPayer,
  Refund,
  Responses,
  Asset,
  TaxYear,
  TaxYears
} from 'ustaxes/core/data'
import { getRequiredQuestions } from 'ustaxes/core/data/questions'
import {
  isW2Valid,
  isF1099Valid,
  isRealEstateValid,
  isF3921Valid,
  isScheduleK1Valid,
  isEstimatedTaxValid,
  isF1098eValid,
  isHSAValid,
  isIRAValid,
  isDependentValid,
  isSpouseValid,
  isAssetValid
} from 'ustaxes/forms/validation'

export type SectionStatus = 'not-started' | 'in-progress' | 'complete'

export interface SectionProgress {
  id: string
  label: string
  status: SectionStatus
  itemCount?: number
}

export interface ProgressSummary {
  sections: SectionProgress[]
  completedCount: number
  totalCount: number
  overallPercentage: number
}

/**
 * Get the status of primary taxpayer section
 */
const getPrimaryTaxpayerStatus = (taxPayer: TaxPayer): SectionStatus => {
  const p = taxPayer.primaryPerson
  if (!p) return 'not-started'

  // Check if all required fields are filled
  const isComplete = !!(
    p.firstName &&
    p.lastName &&
    p.ssid &&
    p.address.address &&
    p.address.city &&
    (p.address.state || p.address.foreignCountry)
  )

  if (isComplete) return 'complete'

  // If any field has data, it's in-progress
  const hasAnyData = !!(p.firstName || p.lastName || p.ssid)
  return hasAnyData ? 'in-progress' : 'not-started'
}

/**
 * Get status for refund information
 */
const getRefundStatus = (refund: Refund | undefined): SectionStatus => {
  if (!refund) return 'not-started'

  const isComplete = !!(
    refund.routingNumber &&
    refund.accountNumber &&
    refund.accountType
  )
  if (isComplete) return 'complete'

  const hasAnyData = !!(refund.routingNumber || refund.accountNumber)
  return hasAnyData ? 'in-progress' : 'not-started'
}

/**
 * Get status for informational questions
 * Questions are complete if all boolean questions have been answered (are not undefined)
 */
const getQuestionsStatus = (info: Information): SectionStatus => {
  const requiredQuestions = getRequiredQuestions(info)

  if (requiredQuestions.length === 0) {
    return 'complete'
  }

  const answers: Responses = info.questions ?? {}

  const isAnswered = (tag: string, valueTag: string): boolean => {
    const value = (answers as Record<string, unknown>)[tag]
    if (valueTag === 'boolean') {
      return value !== undefined
    }
    if (valueTag === 'string') {
      return typeof value === 'string' && value.trim().length > 0
    }
    return value !== undefined
  }

  const answeredCount = requiredQuestions.filter((q) =>
    isAnswered(q.tag, q.valueTag)
  ).length

  if (answeredCount === 0) return 'not-started'
  if (answeredCount === requiredQuestions.length) return 'complete'
  return 'in-progress'
}

/**
 * Get status for array-based sections (W2s, 1099s, etc.)
 * Each item needs to have minimum data to count as a valid entry
 */
const getArraySectionStatus = <T>(
  items: T[],
  isItemComplete: (item: T) => boolean
): SectionStatus => {
  if (items.length === 0) return 'not-started'

  // All items must be complete for section to be complete
  const allComplete = items.every(isItemComplete)
  if (allComplete) return 'complete'

  // Some items exist but not all complete = in-progress
  return 'in-progress'
}

/**
 * Filter assets relevant to a specific tax year
 * An asset is relevant if it was sold during that year (closeDate in that year)
 */
const filterAssetsForYear = (
  assets: Asset<Date>[],
  year: TaxYear
): Asset<Date>[] => {
  const yearNum = TaxYears[year]
  return assets.filter(
    (a) => a.closeDate !== undefined && a.closeDate.getFullYear() === yearNum
  )
}

/**
 * Calculate progress for all sections
 */
export const calculateProgress = (
  info: Information,
  assets: Asset<Date>[] = [],
  activeYear: TaxYear = 'Y2025'
): ProgressSummary => {
  // Filter assets to only those sold in the active year
  const yearAssets = filterAssetsForYear(assets, activeYear)

  const sections: SectionProgress[] = [
    // Personal section
    {
      id: 'primary-taxpayer',
      label: 'Primary Taxpayer',
      status: getPrimaryTaxpayerStatus(info.taxPayer)
    },
    {
      id: 'spouse-dependents',
      label: 'Spouse and Dependents',
      status: (() => {
        const deps = info.taxPayer.dependents
        const spouse = info.taxPayer.spouse
        const hasSpouse = !!spouse
        if (deps.length === 0 && !hasSpouse) return 'not-started'
        // Check if all dependents are valid
        const allDepsValid = deps.every((d) => isDependentValid(d))
        const spouseValid = spouse ? isSpouseValid(spouse) : true
        return allDepsValid && spouseValid ? 'complete' : 'in-progress'
      })(),
      itemCount:
        info.taxPayer.dependents.length + (info.taxPayer.spouse ? 1 : 0)
    },
    // Income sections
    {
      id: 'w2s',
      label: 'Wages (W2)',
      status: getArraySectionStatus(info.w2s, isW2Valid),
      itemCount: info.w2s.length
    },
    {
      id: 'f1099s',
      label: 'Income (1099)',
      status: getArraySectionStatus(info.f1099s, isF1099Valid),
      itemCount: info.f1099s.length
    },
    {
      id: 'real-estate',
      label: 'Rental Income',
      status: getArraySectionStatus(info.realEstate, isRealEstateValid),
      itemCount: info.realEstate.length
    },
    {
      id: 'other-investments',
      label: 'Other Investments',
      status: getArraySectionStatus(yearAssets, isAssetValid),
      itemCount: yearAssets.length
    },
    {
      id: 'stock-options',
      label: 'Stock Options',
      status: getArraySectionStatus(info.f3921s, isF3921Valid),
      itemCount: info.f3921s.length
    },
    {
      id: 'partnership-income',
      label: 'Partnership Income',
      status: getArraySectionStatus(
        info.scheduleK1Form1065s,
        isScheduleK1Valid
      ),
      itemCount: info.scheduleK1Form1065s.length
    },
    // Payments section
    {
      id: 'estimated-taxes',
      label: 'Estimated Taxes',
      status: getArraySectionStatus(info.estimatedTaxes, isEstimatedTaxValid),
      itemCount: info.estimatedTaxes.length
    },
    // Deductions section
    {
      id: 'student-loans',
      label: 'Student Loan Interest',
      status: getArraySectionStatus(info.f1098es, isF1098eValid),
      itemCount: info.f1098es.length
    },
    {
      id: 'itemized-deductions',
      label: 'Itemized Deductions',
      status: info.itemizedDeductions ? 'complete' : 'not-started'
    },
    // Savings Accounts section
    {
      id: 'hsa',
      label: 'Health Savings Account',
      status: getArraySectionStatus(info.healthSavingsAccounts, isHSAValid),
      itemCount: info.healthSavingsAccounts.length
    },
    {
      id: 'ira',
      label: 'IRA',
      status: getArraySectionStatus(
        info.individualRetirementArrangements,
        isIRAValid
      ),
      itemCount: info.individualRetirementArrangements.length
    },
    // Questions section
    {
      id: 'questions',
      label: 'Informational Questions',
      status: getQuestionsStatus(info)
    },
    // Results section
    {
      id: 'refund',
      label: 'Refund Information',
      status: getRefundStatus(info.refund)
    }
  ]

  // Only count complete sections toward percentage
  const completedCount = sections.filter((s) => s.status === 'complete').length
  const totalCount = sections.length

  // Calculate percentage: each section counts equally
  const overallPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return {
    sections,
    completedCount,
    totalCount,
    overallPercentage
  }
}

/**
 * Hook to get progress information for the current tax year
 */
export function useProgress(): ProgressSummary {
  const activeYear = useSelector((state: YearsTaxesState) => state.activeYear)
  const information = useSelector((state: YearsTaxesState) => state[activeYear])
  const assets = useSelector((state: YearsTaxesState) => state.assets)
  // Get completed sections for the active year (per-year tracking)
  const completedSections = useSelector(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (state: YearsTaxesState) =>
      state.appSettings.completedSectionsByYear[activeYear] ?? []
  )

  return useMemo(() => {
    const progress = calculateProgress(information, assets, activeYear)

    // A section is only shown as "complete" if:
    // 1. User has explicitly marked it complete via the completion modal
    // 2. AND the underlying data is valid (no invalid items)
    //
    // Without user confirmation, sections show as:
    // - "not-started" if no data exists
    // - "in-progress" if any data exists (even if valid)
    //
    // "Valid" means: either no items exist, or all items pass validation
    const sectionsWithUserComplete = progress.sections.map((section) => {
      const userMarkedComplete = completedSections.includes(
        section.id as SectionId
      )
      // Data is valid if section is 'complete' OR 'not-started' (no invalid items)
      const dataIsValid =
        section.status === 'complete' || section.status === 'not-started'
      const hasData = section.status !== 'not-started'

      // Only mark as complete if user marked it AND data is valid
      if (userMarkedComplete && dataIsValid) {
        return { ...section, status: 'complete' as SectionStatus }
      }

      // If user marked it but data is now invalid, show as in-progress
      if (userMarkedComplete && !dataIsValid) {
        return { ...section, status: 'in-progress' as SectionStatus }
      }

      // If user hasn't marked it complete, show as in-progress if any data exists
      // (even if all data is valid - user must explicitly confirm completion)
      if (!userMarkedComplete && hasData) {
        return { ...section, status: 'in-progress' as SectionStatus }
      }

      return section
    })

    const completedCount = sectionsWithUserComplete.filter(
      (s) => s.status === 'complete'
    ).length

    return {
      ...progress,
      sections: sectionsWithUserComplete,
      completedCount,
      overallPercentage:
        progress.totalCount > 0
          ? Math.round((completedCount / progress.totalCount) * 100)
          : 0
    }
  }, [information, assets, activeYear, completedSections])
}

/**
 * Hook to get raw progress information (before user completion overrides)
 * This is useful for checking if data is valid before showing completion modal
 */
export function useRawProgress(): ProgressSummary {
  const activeYear = useSelector((state: YearsTaxesState) => state.activeYear)
  const information = useSelector((state: YearsTaxesState) => state[activeYear])
  const assets = useSelector((state: YearsTaxesState) => state.assets)

  return useMemo(
    () => calculateProgress(information, assets, activeYear),
    [information, assets, activeYear]
  )
}

/**
 * Map URL paths to section IDs for progress tracking
 */
export const urlToSectionId: Record<string, SectionId> = {
  '/info': 'primary-taxpayer',
  '/spouseanddependent': 'spouse-dependents',
  '/income/w2jobinfo': 'w2s',
  '/income/f1099s': 'f1099s',
  '/income/realestate': 'real-estate',
  '/income/otherinvestments': 'other-investments',
  '/income/stockoptions': 'stock-options',
  '/income/partnershipincome': 'partnership-income',
  '/payments/estimatedtaxes': 'estimated-taxes',
  '/deductions/studentloaninterest': 'student-loans',
  '/deductions/itemized': 'itemized-deductions',
  '/savingsaccounts/hsa': 'hsa',
  '/savingsaccounts/ira': 'ira',
  '/refundinfo': 'refund',
  '/questions': 'questions'
}
