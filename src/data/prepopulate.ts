import { Information } from 'ustaxes/core/data'
import { blankState } from 'ustaxes/redux/reducer'

export const hasYearData = (info: Information): boolean => {
  if (info.taxPayer.primaryPerson) return true
  if (info.taxPayer.spouse) return true
  if (info.taxPayer.dependents.length > 0) return true
  if (info.taxPayer.filingStatus !== undefined) return true

  if (info.w2s.length > 0) return true
  if (info.f1099s.length > 0) return true
  if (info.scheduleK1Form1065s.length > 0) return true

  if (info.estimatedTaxes.length > 0) return true
  if (info.realEstate.length > 0) return true
  if (info.f1098es.length > 0) return true
  if (info.f3921s.length > 0) return true
  if (info.healthSavingsAccounts.length > 0) return true
  if (info.individualRetirementArrangements.length > 0) return true
  if (info.credits.length > 0) return true
  if (info.itemizedDeductions !== undefined) return true

  if (info.stateResidencies.length > 0) return true
  if (info.refund !== undefined) return true
  if (Object.keys(info.questions).length > 0) return true

  return false
}

export const pickPrepopulateFields = (source: Information): Information => {
  return {
    ...blankState,
    taxPayer: {
      ...blankState.taxPayer,
      filingStatus: source.taxPayer.filingStatus,
      contactEmail: source.taxPayer.contactEmail,
      contactPhoneNumber: source.taxPayer.contactPhoneNumber,
      primaryPerson: source.taxPayer.primaryPerson
        ? {
            ...source.taxPayer.primaryPerson,
            address: { ...source.taxPayer.primaryPerson.address }
          }
        : undefined,
      spouse: source.taxPayer.spouse
        ? { ...source.taxPayer.spouse }
        : undefined,
      dependents: source.taxPayer.dependents.map((dependent) => ({
        ...dependent
      }))
    },
    stateResidencies: source.stateResidencies.map((residency) => ({
      ...residency
    }))
  }
}
