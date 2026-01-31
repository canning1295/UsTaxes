/**
 * Data detection utilities for encryption workflow
 *
 * Provides functions to detect if the user has existing tax data
 * that would need to be encrypted/decrypted during security operations.
 */

import { YearsTaxesState } from 'ustaxes/redux/data'
import { TaxYear, TaxYears, Information } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'

/**
 * All tax year keys for iteration
 */
const allTaxYears: TaxYear[] = enumKeys(TaxYears)

/**
 * Check if a single year's information has any meaningful data
 */
export const hasYearData = (info: Information): boolean => {
  // Check taxpayer info
  if (info.taxPayer.primaryPerson) return true
  if (info.taxPayer.spouse) return true
  if (info.taxPayer.dependents.length > 0) return true
  if (info.taxPayer.filingStatus !== undefined) return true

  // Check income sources
  if (info.w2s.length > 0) return true
  if (info.f1099s.length > 0) return true
  if (info.scheduleK1Form1065s.length > 0) return true

  // Check deductions and credits
  if (info.estimatedTaxes.length > 0) return true
  if (info.realEstate.length > 0) return true
  if (info.f1098es.length > 0) return true
  if (info.f3921s.length > 0) return true
  if (info.healthSavingsAccounts.length > 0) return true
  if (info.individualRetirementArrangements.length > 0) return true
  if (info.credits.length > 0) return true
  if (info.itemizedDeductions !== undefined) return true

  // Check state residencies
  if (info.stateResidencies.length > 0) return true

  // Check refund info
  if (info.refund !== undefined) return true

  // Check questions
  if (Object.keys(info.questions).length > 0) return true

  return false
}

/**
 * Helper to get year data from state with proper typing
 */
const getYearInfo = (
  state: YearsTaxesState,
  year: TaxYear
): Information | undefined => {
  return state[year]
}

/**
 * Check if the state has any existing tax data across all years
 * Used to determine if we should warn user before encryption
 */
export const hasExistingTaxData = (state: YearsTaxesState): boolean => {
  // Check all tax years
  for (const year of allTaxYears) {
    const yearInfo = getYearInfo(state, year)
    if (yearInfo && hasYearData(yearInfo)) {
      return true
    }
  }

  // Check assets
  if (state.assets.length > 0) {
    return true
  }

  return false
}

/**
 * Get a summary of what data exists in the state
 * Useful for showing the user what will be encrypted
 */
export interface DataSummary {
  hasData: boolean
  yearsWithData: TaxYear[]
  assetCount: number
  w2Count: number
  f1099Count: number
  dependentCount: number
  hasPrimaryPerson: boolean
  hasSpouse: boolean
}

export const getDataSummary = (state: YearsTaxesState): DataSummary => {
  const summary: DataSummary = {
    hasData: false,
    yearsWithData: [],
    assetCount: state.assets.length,
    w2Count: 0,
    f1099Count: 0,
    dependentCount: 0,
    hasPrimaryPerson: false,
    hasSpouse: false
  }

  for (const year of allTaxYears) {
    const yearInfo = getYearInfo(state, year)
    if (yearInfo && hasYearData(yearInfo)) {
      summary.yearsWithData.push(year)
      summary.w2Count += yearInfo.w2s.length
      summary.f1099Count += yearInfo.f1099s.length
      summary.dependentCount += yearInfo.taxPayer.dependents.length

      if (yearInfo.taxPayer.primaryPerson) {
        summary.hasPrimaryPerson = true
      }
      if (yearInfo.taxPayer.spouse) {
        summary.hasSpouse = true
      }
    }
  }

  summary.hasData =
    summary.yearsWithData.length > 0 ||
    summary.assetCount > 0 ||
    summary.hasPrimaryPerson

  return summary
}

/**
 * Parsed localStorage structure for encryption detection
 *
 * NOTE: Only the __ustaxes_encrypted__ format is actually used by the codebase.
 * Legacy formats (__encrypted, __security.protected) were checked but never created.
 * They have been removed to reduce confusion.
 */
interface ParsedStorage {
  __ustaxes_encrypted__?: boolean
  encrypted?: {
    salt?: string
    iv?: string
    data?: string
  }
}

/**
 * Check if the stored data in localStorage is encrypted
 * Returns true if data appears to be in encrypted format
 *
 * The only active encryption format uses:
 * { __ustaxes_encrypted__: true, encrypted: { salt, iv, data } }
 */
export const isDataEncrypted = (): boolean => {
  try {
    const stored = localStorage.getItem('persist:root')
    if (!stored) return false

    const parsed = JSON.parse(stored) as ParsedStorage

    // Check for encrypted wrapper format (__ustaxes_encrypted__)
    if (parsed.__ustaxes_encrypted__ === true && parsed.encrypted?.data) {
      return true
    }

    return false
  } catch {
    return false
  }
}

// NOTE: isLegacySecurityFormat was removed - the legacy format was never created by any code path
// See .amp/plans/fix-encryption/AUDIT_FINDINGS.md for details

/**
 * Summary of data for a single tax year (used by import dialog)
 */
export interface YearDataSummary {
  year: TaxYear
  hasData: boolean
  primaryName?: string
  w2Count: number
  income1099Count: number
  hasLocalConflict: boolean
}

/**
 * Generate year-by-year summaries for import data
 * Compares imported data against local data to detect conflicts
 *
 * @param importedState - The parsed state from the import file
 * @param localState - The current local Redux state
 * @returns Array of YearDataSummary for each year
 */
export const getYearDataSummaries = (
  importedState: Partial<YearsTaxesState>,
  localState: YearsTaxesState
): YearDataSummary[] => {
  const summaries: YearDataSummary[] = []

  for (const year of allTaxYears) {
    const importedYearInfo = importedState[year]
    const localYearInfo = getYearInfo(localState, year)

    const importHasData = importedYearInfo
      ? hasYearData(importedYearInfo)
      : false
    const localHasData = localYearInfo ? hasYearData(localYearInfo) : false

    // Get primary person name if available
    let primaryName: string | undefined
    if (importedYearInfo?.taxPayer.primaryPerson) {
      const person = importedYearInfo.taxPayer.primaryPerson
      primaryName = `${person.firstName} ${person.lastName}`.trim()
    }

    summaries.push({
      year,
      hasData: importHasData,
      primaryName,
      w2Count: importedYearInfo?.w2s.length ?? 0,
      income1099Count: importedYearInfo?.f1099s.length ?? 0,
      hasLocalConflict: importHasData && localHasData
    })
  }

  return summaries
}
