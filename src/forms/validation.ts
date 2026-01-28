/**
 * Validation functions for form items
 * These are used to display validation status icons in the item list
 */

import { IncomeW2 } from 'ustaxes/core/data'

// W2 validation
export interface W2UserInput {
  employer?: { employerName?: string; EIN?: string }
  occupation?: string
  income?: string | number
  fedWithholding?: string | number
  ssWages?: string | number
  ssWithholding?: string | number
  medicareIncome?: string | number
  medicareWithholding?: string | number
  personRole?: string
}

export const isW2Valid = (w2: W2UserInput | IncomeW2): boolean => {
  return !!(
    w2.employer?.employerName &&
    w2.income !== undefined &&
    w2.income !== '' &&
    w2.personRole
  )
}

// Dependent validation
export interface DependentUserInput {
  firstName?: string
  lastName?: string
  ssid?: string
  dateOfBirth?: Date | string
  relationship?: string
}

export const isDependentValid = (dep: DependentUserInput): boolean => {
  return !!(
    dep.firstName &&
    dep.lastName &&
    dep.ssid &&
    dep.dateOfBirth &&
    dep.relationship
  )
}

// F1098e (Student Loan Interest) validation
export interface F1098eUserInput {
  lender?: string
  interest?: number | string
}

export const isF1098eValid = (f1098e: F1098eUserInput): boolean => {
  return !!(
    f1098e.lender &&
    f1098e.interest !== undefined &&
    f1098e.interest !== ''
  )
}

// Estimated Tax validation
export interface EstimatedTaxUserInput {
  label?: string
  payment?: number | string
}

export const isEstimatedTaxValid = (et: EstimatedTaxUserInput): boolean => {
  return !!(et.label && et.payment !== undefined && et.payment !== '')
}

// HSA validation
export interface HSAUserInput {
  label?: string
  coverageType?: string
  contributions?: number | string
  personRole?: string
  startDate?: string | Date
  endDate?: string | Date
}

export const isHSAValid = (hsa: HSAUserInput): boolean => {
  return !!(
    hsa.label &&
    hsa.coverageType &&
    hsa.personRole &&
    hsa.contributions !== undefined
  )
}

// IRA validation
export interface IRAUserInput {
  payer?: string
  personRole?: string
  planType?: string
  contributions?: number | string
}

export const isIRAValid = (ira: IRAUserInput): boolean => {
  return !!(ira.payer && ira.personRole && ira.planType)
}

// Real Estate validation
export interface RealEstateUserInput {
  address?: { address?: string; city?: string }
  propertyType?: string
  rentReceived?: number | string
}

export const isRealEstateValid = (re: RealEstateUserInput): boolean => {
  return !!(re.address?.address && re.propertyType)
}

// F3921 (Stock Options) validation
export interface F3921UserInput {
  name?: string
  personRole?: string
  exercisePricePerShare?: number | string
  fmv?: number | string
  numShares?: number | string
}

export const isF3921Valid = (f3921: F3921UserInput): boolean => {
  return !!(
    f3921.name &&
    f3921.personRole &&
    f3921.exercisePricePerShare !== undefined &&
    f3921.fmv !== undefined &&
    f3921.numShares !== undefined
  )
}

// Schedule K1 (Partnership) validation
export interface ScheduleK1UserInput {
  partnershipName?: string
  partnershipEin?: string
  personRole?: string
}

export const isScheduleK1Valid = (k1: ScheduleK1UserInput): boolean => {
  return !!(k1.partnershipName && k1.personRole)
}

// F1099 validation
export interface F1099UserInput {
  formType?: string
  payer?: string
  personRole?: string
}

export const isF1099Valid = (f1099: F1099UserInput): boolean => {
  return !!(f1099.formType && f1099.payer && f1099.personRole)
}

// Asset (Other Investments) validation
export interface AssetUserInput {
  name?: string
  positionType?: string
  openDate?: Date | string
  openPrice?: number | string
  quantity?: number | string
}

export const isAssetValid = (asset: AssetUserInput): boolean => {
  return !!(
    asset.name &&
    asset.positionType &&
    asset.openDate &&
    asset.openPrice !== undefined &&
    asset.quantity !== undefined
  )
}
