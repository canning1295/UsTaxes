import { Asset, Information, Person, TaxYear } from 'ustaxes/core/data'
import { SecurityState } from './security/reducer'

/**
 * This is a simplified form of our global TaxesState
 * which allows TaxesState to be viewed as if if contained
 * data for a single year.
 */
export type TaxesState = { information: Information }

/**
 * Blank state for a single year
 */
export const blankState: Information = {
  f1099s: [],
  w2s: [],
  estimatedTaxes: [],
  realEstate: [],
  taxPayer: { dependents: [] },
  questions: {},
  f1098es: [],
  f3921s: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  stateResidencies: [],
  healthSavingsAccounts: [],
  credits: [],
  individualRetirementArrangements: []
}

/**
 * Section IDs that can be marked as complete
 */
export type SectionId =
  | 'primary-taxpayer'
  | 'spouse-dependents'
  | 'w2s'
  | 'f1099s'
  | 'real-estate'
  | 'other-investments'
  | 'stock-options'
  | 'partnership-income'
  | 'estimated-taxes'
  | 'student-loans'
  | 'itemized-deductions'
  | 'hsa'
  | 'ira'
  | 'questions'
  | 'refund'

/**
 * App-wide settings (non-security related)
 */
export interface AppSettings {
  autoSaveEnabled: boolean
  /** Per-year mapping of completed section IDs */
  completedSectionsByYear: { [K in TaxYear]?: SectionId[] }
}

export const defaultAppSettings: AppSettings = {
  autoSaveEnabled: false,
  completedSectionsByYear: {}
}

export type YearsTaxesState<D = Date> = { [K in TaxYear]: Information<D> } & {
  assets: Asset<D>[]
  activeYear: TaxYear
  security: SecurityState
  appSettings: AppSettings
}

import { defaultSecuritySettings, defaultLockState } from 'ustaxes/crypto'

export const blankYearTaxesState: YearsTaxesState = {
  assets: [],
  Y2019: blankState,
  Y2020: blankState,
  Y2021: blankState,
  Y2022: blankState,
  Y2023: blankState,
  Y2024: blankState,
  Y2025: blankState,
  activeYear: 'Y2025',
  security: {
    settings: defaultSecuritySettings,
    lock: defaultLockState
  },
  appSettings: defaultAppSettings
}

export const dateToStringPerson = <P extends Person<Date>>(
  p: P
): Omit<P, 'dateOfBirth'> & { dateOfBirth: string } => ({
  ...p,
  dateOfBirth: p.dateOfBirth.toISOString()
})

export const stringToDatePerson = <P extends Person<string>>(
  p: P
): Omit<P, 'dateOfBirth'> & { dateOfBirth: Date } => ({
  ...p,
  dateOfBirth: new Date(p.dateOfBirth)
})

export const stringToDateInfo = <I extends Information<string>>(
  info: I
): Information<Date> => ({
  ...info,
  healthSavingsAccounts: info.healthSavingsAccounts.map((h) => ({
    ...h,
    startDate: new Date(h.startDate),
    endDate: new Date(h.endDate)
  })),
  taxPayer: {
    ...info.taxPayer,
    primaryPerson: info.taxPayer.primaryPerson
      ? stringToDatePerson(info.taxPayer.primaryPerson)
      : undefined,
    dependents: info.taxPayer.dependents.map((d) => stringToDatePerson(d)),
    spouse: info.taxPayer.spouse
      ? stringToDatePerson(info.taxPayer.spouse)
      : undefined
  }
})

export const infoToStringInfo = <I extends Information<Date>>(
  info: I
): Information<string> => ({
  ...info,
  healthSavingsAccounts: info.healthSavingsAccounts.map((h) => ({
    ...h,
    startDate: h.startDate.toISOString(),
    endDate: h.endDate.toISOString()
  })),
  taxPayer: {
    ...info.taxPayer,
    primaryPerson: info.taxPayer.primaryPerson
      ? dateToStringPerson(info.taxPayer.primaryPerson)
      : undefined,
    dependents: info.taxPayer.dependents.map((d) => dateToStringPerson(d)),
    spouse: info.taxPayer.spouse
      ? dateToStringPerson(info.taxPayer.spouse)
      : undefined
  }
})
