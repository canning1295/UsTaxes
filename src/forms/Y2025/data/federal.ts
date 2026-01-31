import { FilingStatus } from 'ustaxes/core/data'
import { linear, Piecewise } from 'ustaxes/core/util'

export const CURRENT_YEAR = 2025

interface TaggedAmount {
  name: string
  amount: number
}

interface Brackets {
  brackets: number[]
}

interface Deductions {
  deductions: TaggedAmount[]
  exemptions: TaggedAmount[]
}

interface Rates {
  rates: number[]
}

interface FederalBrackets {
  ordinary: Rates & { status: { [key in FilingStatus]: Brackets & Deductions } }
  longTermCapGains: Rates & { status: { [key in FilingStatus]: Brackets } }
}

// Tax brackets can be most easily found via google
// The standard deduction amounts with the allowances can be most
// easily found at the end of 1040-SR
const federalBrackets: FederalBrackets = {
  ordinary: {
    rates: [10, 12, 22, 24, 32, 35, 37],
    status: {
      [FilingStatus.S]: {
        brackets: [11925, 48475, 103350, 197300, 250525, 626350],
        deductions: [
          {
            name: 'Standard Deduction (Single)',
            amount: 15000
          },
          {
            name: 'Standard Deduction (Single) with 1 age or blindness allowance',
            amount: 17000
          },
          {
            name: 'Standard Deduction (Single) with 2 age or blindness allowances',
            amount: 19000
          }
        ],
        exemptions: [
          {
            name: 'Standard Exemption (Single)',
            amount: 0
          }
        ]
      },
      [FilingStatus.MFJ]: {
        brackets: [23850, 96950, 206700, 394600, 501050, 751600],
        deductions: [
          {
            name: 'Standard Deduction (Married)',
            amount: 30000
          },
          {
            name: 'Standard Deduction (Married) with 1 age or blindness allowance',
            amount: 31600
          },
          {
            name: 'Standard Deduction (Married) with 2 age or blindness allowances',
            amount: 33200
          },
          {
            name: 'Standard Deduction (Married) with 3 age or blindness allowances',
            amount: 34800
          },
          {
            name: 'Standard Deduction (Married) with 4 age or blindness allowances',
            amount: 36400
          }
        ],
        exemptions: [
          {
            name: 'Standard Exemption (Single)',
            amount: 0
          }
        ]
      },
      [FilingStatus.W]: {
        brackets: [23850, 96950, 206700, 394600, 501050, 751600],
        deductions: [
          {
            name: 'Standard Deduction (Widowed)',
            amount: 30000
          },
          {
            name: 'Standard Deduction (Widowed) with 1 age or blindness allowance',
            amount: 31600
          },
          {
            name: 'Standard Deduction (Widowed) with 2 age or blindness allowances',
            amount: 33200
          }
        ],
        exemptions: [
          {
            name: 'Standard Exemption (Widowed)',
            amount: 0
          }
        ]
      },
      [FilingStatus.MFS]: {
        brackets: [11925, 48475, 103350, 197300, 250525, 375800],
        deductions: [
          {
            name: 'Standard Deduction (Married Filing Separately)',
            amount: 15000
          },
          {
            name: 'Standard Deduction (Married Filing Separately) with 1 age or blindness allowance',
            amount: 16600
          },
          {
            name: 'Standard Deduction (Married Filing Separately) with 2 age or blindness allowances',
            amount: 18200
          },
          {
            name: 'Standard Deduction (Married Filing Separately) with 3 age or blindness allowances',
            amount: 19800
          },
          {
            name: 'Standard Deduction (Married Filing Separately) with 4 age or blindness allowances',
            amount: 21400
          }
        ],
        exemptions: [
          {
            name: 'Standard Exemption (Single)',
            amount: 0
          }
        ]
      },
      [FilingStatus.HOH]: {
        brackets: [17000, 64850, 103350, 197300, 250500, 626350],
        deductions: [
          {
            name: 'Standard Deduction (Head of Household)',
            amount: 22500
          },
          {
            name: 'Standard Deduction (Head of Household) with 1 age or blindness allowance',
            amount: 24500
          },
          {
            name: 'Standard Deduction (Head of Household) with 2 age or blindness allowances',
            amount: 26500
          }
        ],
        exemptions: [
          {
            name: 'Standard Exemption (Single)',
            amount: 0
          }
        ]
      }
    }
  },
  longTermCapGains: {
    rates: [0, 15, 20],
    status: {
      [FilingStatus.S]: {
        brackets: [48350, 533400]
      },
      [FilingStatus.MFJ]: {
        brackets: [96700, 600050]
      },
      [FilingStatus.W]: {
        brackets: [96700, 600050]
      },
      [FilingStatus.MFS]: {
        brackets: [48350, 300000]
      },
      [FilingStatus.HOH]: {
        brackets: [64750, 566700]
      }
    }
  }
}

export const fica = {
  maxSSTax: 10918.2,
  maxIncomeSSTaxApplies: 176100,

  regularMedicareTaxRate: 1.45 / 100,
  additionalMedicareTaxRate: 0.9 / 100,
  additionalMedicareTaxThreshold: (filingStatus: FilingStatus): number => {
    switch (filingStatus) {
      case FilingStatus.MFJ: {
        return 250000
      }
      case FilingStatus.MFS: {
        return 125000
      }
      default: {
        return 200000 // Single, Head of Household, Windower
      }
    }
  }
}

// Net Investment Income Tax calculated on form 8960
export const netInvestmentIncomeTax = {
  taxRate: 0.038, // 3.8%
  taxThreshold: (filingStatus: FilingStatus): number => {
    switch (filingStatus) {
      case FilingStatus.MFJ: {
        return 250000
      }
      case FilingStatus.W: {
        return 250000
      }
      case FilingStatus.MFS: {
        return 125000
      }
      default: {
        return 200000 // Single, Head of Household
      }
    }
  }
}

export const healthSavingsAccounts = {
  contributionLimit: {
    'self-only': 4300,
    family: 8550
  }
}
// https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2025
// https://www.irs.gov/instructions/i6251
export const amt = {
  excemption: (
    filingStatus: FilingStatus,
    income: number
  ): number | undefined => {
    switch (filingStatus) {
      case FilingStatus.S:
        if (income <= 626350) {
          return 88100
        }
        break
      case FilingStatus.MFJ:
        if (income <= 1252700) {
          return 137000
        }
        break
      case FilingStatus.MFS:
        if (income <= 626350) {
          return 68500
        }
    }
    // TODO: Handle "Exemption Worksheet"
    return undefined
  },

  // Used for calculating Line 7 on form 6251. See instructions
  cap: (filingStatus: FilingStatus): number => {
    if (filingStatus === FilingStatus.MFS) {
      return 119600
    }
    return 239200
  }
}

// https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/earned-income-and-earned-income-tax-credit-eitc-tables#EITC%20Tables
// line 11 caps based on step one in instructions
// 2025 EITC thresholds per IRS Rev. Proc. 2024-40
const line11Caps = [19104, 50434, 57310, 61555]
const line11MfjCaps = [26214, 57554, 64430, 68675]

type Point = [number, number]

// Provided a list of points, create a piecewise function
// that makes linear segments through the list of points.
const toPieceWise = (points: Point[]): Piecewise =>
  points
    .slice(0, points.length - 1)
    .map((point, idx) => [point, points[idx + 1]])
    .map(([[x1, y1], [x2, y2]]) => ({
      // starting point     slope              intercept
      lowerBound: x1,
      f: linear((y2 - y1) / (x2 - x1), y1 - (x1 * (y2 - y1)) / (x2 - x1))
    }))

// These points are taken directly from IRS publication
// IRS Rev. Proc. 2024-40 for tax year 2025
// https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
const unmarriedFormulas: Piecewise[] = (() => {
  const points: Point[][] = [
    [
      [0, 0],
      [8050, 632],
      [10070, 632],
      [18130, 0]
    ], // 0
    [
      [0, 0],
      [12080, 4108],
      [22160, 4108],
      [47840, 0]
    ], // 1
    [
      [0, 0],
      [16970, 6787],
      [22160, 6787],
      [54390, 0]
    ], // 2
    [
      [0, 0],
      [16970, 7639],
      [22160, 7639],
      [58420, 0]
    ] // 3 or more
  ]
  return points.map((ps: Point[]) => toPieceWise(ps))
})()

const marriedFormulas: Piecewise[] = (() => {
  const points: Point[][] = [
    [
      [0, 0],
      [8050, 632],
      [16820, 632],
      [24880, 0]
    ], // 0
    [
      [0, 0],
      [12080, 4108],
      [28900, 4108],
      [54590, 0]
    ], // 1
    [
      [0, 0],
      [16970, 6787],
      [28900, 6787],
      [61140, 0]
    ], // 2
    [
      [0, 0],
      [16970, 7639],
      [28900, 7639],
      [65170, 0]
    ] // 3 or more
  ]
  return points.map((ps) => toPieceWise(ps))
})()

interface EICDef {
  caps: { [k in FilingStatus]: number[] | undefined }
  maxInvestmentIncome: number
  formulas: { [k in FilingStatus]: Piecewise[] | undefined }
}

export const QualifyingDependents = {
  childMaxAge: 17,
  qualifyingDependentMaxAge: 19,
  qualifyingStudentMaxAge: 24
}

export const EIC: EICDef = {
  // credit caps for number of children (0, 1, 2, 3 or more):
  // Step 1
  caps: {
    [FilingStatus.S]: line11Caps,
    [FilingStatus.W]: line11Caps,
    [FilingStatus.HOH]: line11Caps,
    [FilingStatus.MFS]: undefined,
    [FilingStatus.MFJ]: line11MfjCaps
  },
  maxInvestmentIncome: 11600,
  formulas: {
    [FilingStatus.S]: unmarriedFormulas,
    [FilingStatus.W]: unmarriedFormulas,
    [FilingStatus.HOH]: unmarriedFormulas,
    [FilingStatus.MFS]: undefined,
    [FilingStatus.MFJ]: marriedFormulas
  }
}

export default federalBrackets

// Constants used in the social security benefits worksheet
interface SocialSecurityBenefitsDef {
  caps: { [k in FilingStatus]: { l8: number; l10: number } }
}

// TODO: update for Y2023
export const SSBenefits: SocialSecurityBenefitsDef = {
  caps: {
    [FilingStatus.S]: { l8: 25000, l10: 9000 },
    [FilingStatus.W]: { l8: 25000, l10: 9000 },
    [FilingStatus.HOH]: { l8: 25000, l10: 9000 },
    [FilingStatus.MFS]: { l8: 25000, l10: 9000 },
    [FilingStatus.MFJ]: { l8: 32000, l10: 12000 }
  }
}
