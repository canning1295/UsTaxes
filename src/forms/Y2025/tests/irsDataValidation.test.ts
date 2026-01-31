/**
 * IRS Data Validation Tests for Tax Year 2025
 *
 * These tests validate that all values in federal.ts match the official IRS
 * publications for tax year 2025. This catches copy/paste errors when adding
 * new tax years.
 *
 * Primary IRS Sources:
 * - Rev. Proc. 2024-40: Tax inflation adjustments for 2025
 * - Form 1040 / 1040-SR Instructions
 * - Publication 15 (Circular E): Employer's Tax Guide
 * - Publication 596: Earned Income Credit
 *
 * @see https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
 */

import { FilingStatus } from 'ustaxes/core/data'
import federalBrackets, {
  CURRENT_YEAR,
  fica,
  netInvestmentIncomeTax,
  healthSavingsAccounts,
  amt,
  EIC,
  QualifyingDependents
} from '../data/federal'

describe('Y2025 IRS Data Validation', () => {
  describe('Tax Year', () => {
    it('should be 2025', () => {
      expect(CURRENT_YEAR).toEqual(2025)
    })
  })

  /**
   * Standard Deduction Amounts
   * Source: IRS Rev. Proc. 2024-40 Section .15
   *
   * Base amounts:
   * - Single/MFS: $15,000
   * - MFJ/Surviving Spouse: $30,000
   * - Head of Household: $22,500
   *
   * Additional for aged (65+) or blind:
   * - Married (MFJ, MFS, Surviving Spouse): $1,600 per allowance
   * - Unmarried (Single, HOH): $2,000 per allowance
   */
  describe('Standard Deduction Amounts (Rev. Proc. 2024-40 Section .15)', () => {
    const IRS_VALUES = {
      // Base standard deductions
      SINGLE_BASE: 15000,
      MFJ_BASE: 30000,
      MFS_BASE: 15000,
      HOH_BASE: 22500,
      WIDOW_BASE: 30000,
      // Additional for aged/blind
      MARRIED_ADDITIONAL: 1600, // Per allowance for MFJ, MFS, Widow(er)
      UNMARRIED_ADDITIONAL: 2000 // Per allowance for Single, HOH
    }

    describe('Single filer', () => {
      const deductions =
        federalBrackets.ordinary.status[FilingStatus.S].deductions

      it('base deduction should be $15,000', () => {
        expect(deductions[0].amount).toEqual(IRS_VALUES.SINGLE_BASE)
      })

      it('with 1 allowance should be $17,000', () => {
        const expected =
          IRS_VALUES.SINGLE_BASE + IRS_VALUES.UNMARRIED_ADDITIONAL
        expect(deductions[1].amount).toEqual(expected)
      })

      it('with 2 allowances should be $19,000', () => {
        const expected =
          IRS_VALUES.SINGLE_BASE + 2 * IRS_VALUES.UNMARRIED_ADDITIONAL
        expect(deductions[2].amount).toEqual(expected)
      })
    })

    describe('Married Filing Jointly', () => {
      const deductions =
        federalBrackets.ordinary.status[FilingStatus.MFJ].deductions

      it('base deduction should be $30,000', () => {
        expect(deductions[0].amount).toEqual(IRS_VALUES.MFJ_BASE)
      })

      it('with 1 allowance should be $31,600', () => {
        const expected = IRS_VALUES.MFJ_BASE + IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[1].amount).toEqual(expected)
      })

      it('with 2 allowances should be $33,200', () => {
        const expected = IRS_VALUES.MFJ_BASE + 2 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[2].amount).toEqual(expected)
      })

      it('with 3 allowances should be $34,800', () => {
        const expected = IRS_VALUES.MFJ_BASE + 3 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[3].amount).toEqual(expected)
      })

      it('with 4 allowances should be $36,400', () => {
        const expected = IRS_VALUES.MFJ_BASE + 4 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[4].amount).toEqual(expected)
      })
    })

    describe('Married Filing Separately', () => {
      const deductions =
        federalBrackets.ordinary.status[FilingStatus.MFS].deductions

      it('base deduction should be $15,000', () => {
        expect(deductions[0].amount).toEqual(IRS_VALUES.MFS_BASE)
      })

      it('with 1 allowance should be $16,600', () => {
        const expected = IRS_VALUES.MFS_BASE + IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[1].amount).toEqual(expected)
      })

      it('with 2 allowances should be $18,200', () => {
        const expected = IRS_VALUES.MFS_BASE + 2 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[2].amount).toEqual(expected)
      })

      it('with 3 allowances should be $19,800', () => {
        const expected = IRS_VALUES.MFS_BASE + 3 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[3].amount).toEqual(expected)
      })

      it('with 4 allowances should be $21,400', () => {
        const expected = IRS_VALUES.MFS_BASE + 4 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[4].amount).toEqual(expected)
      })
    })

    describe('Head of Household', () => {
      const deductions =
        federalBrackets.ordinary.status[FilingStatus.HOH].deductions

      it('base deduction should be $22,500', () => {
        expect(deductions[0].amount).toEqual(IRS_VALUES.HOH_BASE)
      })

      it('with 1 allowance should be $24,500', () => {
        const expected = IRS_VALUES.HOH_BASE + IRS_VALUES.UNMARRIED_ADDITIONAL
        expect(deductions[1].amount).toEqual(expected)
      })

      it('with 2 allowances should be $26,500', () => {
        const expected =
          IRS_VALUES.HOH_BASE + 2 * IRS_VALUES.UNMARRIED_ADDITIONAL
        expect(deductions[2].amount).toEqual(expected)
      })
    })

    describe('Widow(er) / Qualifying Surviving Spouse', () => {
      const deductions =
        federalBrackets.ordinary.status[FilingStatus.W].deductions

      it('base deduction should be $30,000', () => {
        expect(deductions[0].amount).toEqual(IRS_VALUES.WIDOW_BASE)
      })

      it('with 1 allowance should be $31,600', () => {
        const expected = IRS_VALUES.WIDOW_BASE + IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[1].amount).toEqual(expected)
      })

      it('with 2 allowances should be $33,200', () => {
        const expected =
          IRS_VALUES.WIDOW_BASE + 2 * IRS_VALUES.MARRIED_ADDITIONAL
        expect(deductions[2].amount).toEqual(expected)
      })
    })
  })

  /**
   * Ordinary Income Tax Brackets
   * Source: IRS Rev. Proc. 2024-40 Section .01
   */
  describe('Ordinary Income Tax Brackets (Rev. Proc. 2024-40 Section .01)', () => {
    it('tax rates should be 10%, 12%, 22%, 24%, 32%, 35%, 37%', () => {
      expect(federalBrackets.ordinary.rates).toEqual([
        10, 12, 22, 24, 32, 35, 37
      ])
    })

    describe('Single filer brackets', () => {
      const brackets = federalBrackets.ordinary.status[FilingStatus.S].brackets
      // These are the "up to" thresholds for each bracket transition
      it('should have correct bracket thresholds', () => {
        expect(brackets).toEqual([11925, 48475, 103350, 197300, 250525, 626350])
      })
    })

    describe('MFJ brackets', () => {
      const brackets =
        federalBrackets.ordinary.status[FilingStatus.MFJ].brackets
      it('should have correct bracket thresholds', () => {
        expect(brackets).toEqual([23850, 96950, 206700, 394600, 501050, 751600])
      })
    })

    describe('MFS brackets', () => {
      const brackets =
        federalBrackets.ordinary.status[FilingStatus.MFS].brackets
      it('should have correct bracket thresholds', () => {
        expect(brackets).toEqual([11925, 48475, 103350, 197300, 250525, 375800])
      })
    })

    describe('HOH brackets', () => {
      const brackets =
        federalBrackets.ordinary.status[FilingStatus.HOH].brackets
      it('should have correct bracket thresholds', () => {
        expect(brackets).toEqual([17000, 64850, 103350, 197300, 250500, 626350])
      })
    })
  })

  /**
   * Long-term Capital Gains Tax Brackets
   * Source: IRS Rev. Proc. 2024-40 Section .02
   */
  describe('Long-term Capital Gains Brackets (Rev. Proc. 2024-40 Section .02)', () => {
    it('rates should be 0%, 15%, 20%', () => {
      expect(federalBrackets.longTermCapGains.rates).toEqual([0, 15, 20])
    })

    it('Single: 0% up to $48,350, 15% up to $533,400', () => {
      expect(
        federalBrackets.longTermCapGains.status[FilingStatus.S].brackets
      ).toEqual([48350, 533400])
    })

    it('MFJ: 0% up to $96,700, 15% up to $600,050', () => {
      expect(
        federalBrackets.longTermCapGains.status[FilingStatus.MFJ].brackets
      ).toEqual([96700, 600050])
    })

    it('MFS: 0% up to $48,350, 15% up to $300,000', () => {
      expect(
        federalBrackets.longTermCapGains.status[FilingStatus.MFS].brackets
      ).toEqual([48350, 300000])
    })

    it('HOH: 0% up to $64,750, 15% up to $566,700', () => {
      expect(
        federalBrackets.longTermCapGains.status[FilingStatus.HOH].brackets
      ).toEqual([64750, 566700])
    })
  })

  /**
   * FICA Thresholds
   * Source: SSA Fact Sheet / IRS Publication 15
   *
   * Social Security wage base for 2025: $176,100
   * Maximum SS tax: $10,918.20 (6.2% of $176,100)
   * Additional Medicare Tax threshold: $200,000 (Single), $250,000 (MFJ), $125,000 (MFS)
   */
  describe('FICA Thresholds (SSA / Pub 15)', () => {
    it('Social Security wage base should be $176,100', () => {
      expect(fica.maxIncomeSSTaxApplies).toEqual(176100)
    })

    it('Maximum SS tax should be $10,918.20', () => {
      // 6.2% of $176,100 = $10,918.20
      expect(fica.maxSSTax).toEqual(10918.2)
    })

    it('Medicare tax rate should be 1.45%', () => {
      expect(fica.regularMedicareTaxRate).toBeCloseTo(0.0145, 5)
    })

    it('Additional Medicare tax rate should be 0.9%', () => {
      expect(fica.additionalMedicareTaxRate).toBeCloseTo(0.009, 5)
    })

    describe('Additional Medicare Tax thresholds', () => {
      it('Single/HOH/Widow: $200,000', () => {
        expect(fica.additionalMedicareTaxThreshold(FilingStatus.S)).toEqual(
          200000
        )
        expect(fica.additionalMedicareTaxThreshold(FilingStatus.HOH)).toEqual(
          200000
        )
        expect(fica.additionalMedicareTaxThreshold(FilingStatus.W)).toEqual(
          200000
        )
      })

      it('MFJ: $250,000', () => {
        expect(fica.additionalMedicareTaxThreshold(FilingStatus.MFJ)).toEqual(
          250000
        )
      })

      it('MFS: $125,000', () => {
        expect(fica.additionalMedicareTaxThreshold(FilingStatus.MFS)).toEqual(
          125000
        )
      })
    })
  })

  /**
   * Net Investment Income Tax
   * Source: IRC Section 1411 / Form 8960 Instructions
   */
  describe('Net Investment Income Tax (Form 8960)', () => {
    it('tax rate should be 3.8%', () => {
      expect(netInvestmentIncomeTax.taxRate).toBeCloseTo(0.038, 5)
    })

    describe('NIIT thresholds', () => {
      it('Single/HOH: $200,000', () => {
        expect(netInvestmentIncomeTax.taxThreshold(FilingStatus.S)).toEqual(
          200000
        )
        expect(netInvestmentIncomeTax.taxThreshold(FilingStatus.HOH)).toEqual(
          200000
        )
      })

      it('MFJ/Widow: $250,000', () => {
        expect(netInvestmentIncomeTax.taxThreshold(FilingStatus.MFJ)).toEqual(
          250000
        )
        expect(netInvestmentIncomeTax.taxThreshold(FilingStatus.W)).toEqual(
          250000
        )
      })

      it('MFS: $125,000', () => {
        expect(netInvestmentIncomeTax.taxThreshold(FilingStatus.MFS)).toEqual(
          125000
        )
      })
    })
  })

  /**
   * Health Savings Account Contribution Limits
   * Source: IRS Rev. Proc. 2024-25
   */
  describe('HSA Contribution Limits (Rev. Proc. 2024-25)', () => {
    it('Self-only coverage limit should be $4,300', () => {
      expect(healthSavingsAccounts.contributionLimit['self-only']).toEqual(4300)
    })

    it('Family coverage limit should be $8,550', () => {
      expect(healthSavingsAccounts.contributionLimit.family).toEqual(8550)
    })
  })

  /**
   * Alternative Minimum Tax Exemptions
   * Source: IRS Rev. Proc. 2024-40 / Form 6251 Instructions
   */
  describe('AMT Exemptions (Form 6251)', () => {
    it('Single exemption should be $88,100 (phases out at $626,350)', () => {
      expect(amt.excemption(FilingStatus.S, 0)).toEqual(88100)
      expect(amt.excemption(FilingStatus.S, 626350)).toEqual(88100)
      expect(amt.excemption(FilingStatus.S, 626351)).toBeUndefined()
    })

    it('MFJ exemption should be $137,000 (phases out at $1,252,700)', () => {
      expect(amt.excemption(FilingStatus.MFJ, 0)).toEqual(137000)
      expect(amt.excemption(FilingStatus.MFJ, 1252700)).toEqual(137000)
      expect(amt.excemption(FilingStatus.MFJ, 1252701)).toBeUndefined()
    })

    it('MFS exemption should be $68,500 (phases out at $626,350)', () => {
      expect(amt.excemption(FilingStatus.MFS, 0)).toEqual(68500)
      expect(amt.excemption(FilingStatus.MFS, 626350)).toEqual(68500)
      expect(amt.excemption(FilingStatus.MFS, 626351)).toBeUndefined()
    })

    describe('AMT rate caps', () => {
      it('MFS cap should be $119,600', () => {
        expect(amt.cap(FilingStatus.MFS)).toEqual(119600)
      })

      it('Other statuses cap should be $239,200', () => {
        expect(amt.cap(FilingStatus.S)).toEqual(239200)
        expect(amt.cap(FilingStatus.MFJ)).toEqual(239200)
        expect(amt.cap(FilingStatus.HOH)).toEqual(239200)
      })
    })
  })

  /**
   * Earned Income Credit
   * Source: IRS Rev. Proc. 2024-40 / Publication 596
   */
  describe('Earned Income Credit (Rev. Proc. 2024-40)', () => {
    it('maximum investment income should be $11,600', () => {
      expect(EIC.maxInvestmentIncome).toEqual(11600)
    })

    describe('EIC income caps (Single/HOH/Widow)', () => {
      const caps = EIC.caps[FilingStatus.S]
      it('0 children: $19,104', () => {
        expect(caps?.[0]).toEqual(19104)
      })
      it('1 child: $50,434', () => {
        expect(caps?.[1]).toEqual(50434)
      })
      it('2 children: $57,310', () => {
        expect(caps?.[2]).toEqual(57310)
      })
      it('3+ children: $61,555', () => {
        expect(caps?.[3]).toEqual(61555)
      })
    })

    describe('EIC income caps (MFJ)', () => {
      const caps = EIC.caps[FilingStatus.MFJ]
      it('0 children: $26,214', () => {
        expect(caps?.[0]).toEqual(26214)
      })
      it('1 child: $57,554', () => {
        expect(caps?.[1]).toEqual(57554)
      })
      it('2 children: $64,430', () => {
        expect(caps?.[2]).toEqual(64430)
      })
      it('3+ children: $68,675', () => {
        expect(caps?.[3]).toEqual(68675)
      })
    })

    it('MFS should not be eligible for EIC', () => {
      expect(EIC.caps[FilingStatus.MFS]).toBeUndefined()
      expect(EIC.formulas[FilingStatus.MFS]).toBeUndefined()
    })
  })

  /**
   * Qualifying Dependent Age Limits
   * Source: Publication 501
   */
  describe('Qualifying Dependent Ages (Pub 501)', () => {
    it('Child Tax Credit max age should be 17', () => {
      expect(QualifyingDependents.childMaxAge).toEqual(17)
    })

    it('Qualifying child max age should be 19', () => {
      expect(QualifyingDependents.qualifyingDependentMaxAge).toEqual(19)
    })

    it('Qualifying student max age should be 24', () => {
      expect(QualifyingDependents.qualifyingStudentMaxAge).toEqual(24)
    })
  })
})
