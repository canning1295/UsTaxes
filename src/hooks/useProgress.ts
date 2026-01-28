import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { YearsTaxesState } from 'ustaxes/redux/data'
import { Information, TaxPayer } from 'ustaxes/core/data'

export interface SectionProgress {
  id: string
  label: string
  completed: boolean
  itemCount?: number
  required: boolean
}

export interface ProgressSummary {
  sections: SectionProgress[]
  completedRequired: number
  totalRequired: number
  completedOptional: number
  totalOptional: number
  overallPercentage: number
}

/**
 * Check if primary taxpayer info is complete
 */
const isPrimaryTaxpayerComplete = (taxPayer: TaxPayer): boolean => {
  const p = taxPayer.primaryPerson
  if (!p) return false
  return !!(
    p.firstName &&
    p.lastName &&
    p.ssid &&
    p.address.address &&
    p.address.city &&
    (p.address.state || p.address.foreignCountry)
  )
}

/**
 * Check if refund information is complete (optional but good to have)
 */
const isRefundComplete = (info: Information): boolean => {
  const r = info.refund
  if (!r) return false
  return !!(r.routingNumber && r.accountNumber && r.accountType)
}

/**
 * Calculate progress for all sections
 */
export const calculateProgress = (info: Information): ProgressSummary => {
  const sections: SectionProgress[] = [
    // Required sections
    {
      id: 'primary-taxpayer',
      label: 'Primary Taxpayer',
      completed: isPrimaryTaxpayerComplete(info.taxPayer),
      required: true
    },
    // Optional but commonly used sections
    {
      id: 'spouse-dependents',
      label: 'Spouse and Dependents',
      completed: info.taxPayer.dependents.length > 0 || !!info.taxPayer.spouse,
      itemCount:
        info.taxPayer.dependents.length + (info.taxPayer.spouse ? 1 : 0),
      required: false
    },
    {
      id: 'w2s',
      label: 'Wages (W2)',
      completed: info.w2s.length > 0,
      itemCount: info.w2s.length,
      required: false
    },
    {
      id: 'f1099s',
      label: 'Income (1099)',
      completed: info.f1099s.length > 0,
      itemCount: info.f1099s.length,
      required: false
    },
    {
      id: 'real-estate',
      label: 'Rental Income',
      completed: info.realEstate.length > 0,
      itemCount: info.realEstate.length,
      required: false
    },
    {
      id: 'stock-options',
      label: 'Stock Options',
      completed: info.f3921s.length > 0,
      itemCount: info.f3921s.length,
      required: false
    },
    {
      id: 'partnership-income',
      label: 'Partnership Income',
      completed: info.scheduleK1Form1065s.length > 0,
      itemCount: info.scheduleK1Form1065s.length,
      required: false
    },
    {
      id: 'estimated-taxes',
      label: 'Estimated Taxes',
      completed: info.estimatedTaxes.length > 0,
      itemCount: info.estimatedTaxes.length,
      required: false
    },
    {
      id: 'student-loans',
      label: 'Student Loan Interest',
      completed: info.f1098es.length > 0,
      itemCount: info.f1098es.length,
      required: false
    },
    {
      id: 'itemized-deductions',
      label: 'Itemized Deductions',
      completed: !!info.itemizedDeductions,
      required: false
    },
    {
      id: 'hsa',
      label: 'Health Savings Account',
      completed: info.healthSavingsAccounts.length > 0,
      itemCount: info.healthSavingsAccounts.length,
      required: false
    },
    {
      id: 'ira',
      label: 'IRA',
      completed: info.individualRetirementArrangements.length > 0,
      itemCount: info.individualRetirementArrangements.length,
      required: false
    },
    {
      id: 'refund',
      label: 'Refund Information',
      completed: isRefundComplete(info),
      required: false
    }
  ]

  const requiredSections = sections.filter((s) => s.required)
  const optionalSections = sections.filter((s) => !s.required)

  const completedRequired = requiredSections.filter((s) => s.completed).length
  const completedOptional = optionalSections.filter((s) => s.completed).length

  // Calculate overall percentage based on required completion (100%)
  // and optional sections (bonus)
  const requiredPercentage =
    requiredSections.length > 0
      ? (completedRequired / requiredSections.length) * 100
      : 100

  return {
    sections,
    completedRequired,
    totalRequired: requiredSections.length,
    completedOptional,
    totalOptional: optionalSections.length,
    overallPercentage: requiredPercentage
  }
}

/**
 * Hook to get progress information for the current tax year
 */
export function useProgress(): ProgressSummary {
  const activeYear = useSelector((state: YearsTaxesState) => state.activeYear)
  const information = useSelector((state: YearsTaxesState) => state[activeYear])

  return useMemo(() => calculateProgress(information), [information])
}

/**
 * Map URL paths to section IDs for progress tracking
 */
export const urlToSectionId: Record<string, string> = {
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
