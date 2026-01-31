import { FilingStatus } from 'ustaxes/core/data'
import { CURRENT_YEAR } from '../data/federal'
import { computeOrdinaryTax } from '../irsForms/TaxTable'
import fs from 'fs/promises'
import { parseCsvOrThrow } from 'ustaxes/data/csvImport'

const getTaxTable = async (): Promise<number[][]> => {
  const path = './src/forms/Y2025/tests/taxTable.csv'
  const taxTableCsv = (await fs.readFile(path)).toString('utf-8')
  return parseCsvOrThrow(taxTableCsv, (r: string[], rowNum) =>
    // ignore heading row.
    rowNum > 0 ? [r.map((s) => Number(s))] : []
  )
}

const expectTax = (status: FilingStatus, amount: number, tax: number) => {
  const computedTax = Math.round(computeOrdinaryTax(status, amount))
  expect(computedTax).toEqual(tax)
}

const expectTaxUnder100KRange = (
  status: FilingStatus,
  min: number,
  max: number,
  tax: number
) => {
  const diff = max - min
  const quarter = Math.round((diff / 4) * 100) / 100
  expectTax(status, min, tax)
  expectTax(status, min + quarter, tax)
  expectTax(status, min + 2 * quarter, tax)
  expectTax(status, min + 3 * quarter, tax)
  expectTax(status, max, tax)
}

describe('Tax rates', () => {
  it('test should be updated for new year', () => {
    // WARNING! Do not just change the year. Also update the CSV and expected tax amounts below!
    expect(CURRENT_YEAR).toEqual(2025)
  })
  it('ordinary taxes for single status should be correct', async () => {
    const rows = await getTaxTable()
    rows.forEach(([min, lessThan, tax]) => {
      expectTaxUnder100KRange(FilingStatus.S, min, lessThan - 0.01, tax)
    })

    // Over $100,000
    const amounts = [
      [100000, 16914],
      [100001, 16914],
      [100525, 17030],
      [100526, 17030],
      [191950, 38915],
      [191951, 38915],
      [243725, 55055],
      [243726, 55055],
      [609350, 182820],
      [609351, 182820]
    ]
    amounts.forEach(([amount, tax]) => {
      expectTax(FilingStatus.S, amount, tax)
    })
  })

  it('ordinary taxes for married filing jointly status should be correct', async () => {
    const rows = await getTaxTable()
    rows.forEach(([min, lessThan, , tax]) => {
      expectTaxUnder100KRange(FilingStatus.MFJ, min, lessThan - 0.01, tax)
    })

    // Over $100,000
    const amounts = [
      [100000, 11828],
      [100001, 11828],
      [201050, 34059],
      [201051, 34059],
      [383900, 77830],
      [383901, 77830],
      [487450, 110110],
      [487451, 110110],
      [731200, 195015],
      [731201, 195015]
    ]
    amounts.forEach(([amount, tax]) => {
      expectTax(FilingStatus.MFJ, amount, tax)
    })
  })

  it('ordinary taxes for married filing separately status should be correct', async () => {
    const rows = await getTaxTable()
    rows.forEach(([min, lessThan, , , tax]) => {
      expectTaxUnder100KRange(FilingStatus.MFS, min, lessThan - 0.01, tax)
    })

    // Over $100,000
    const amounts = [
      [100000, 16914],
      [100001, 16914],
      [100525, 17030],
      [100526, 17030],
      [191950, 38915],
      [191951, 38915],
      [243725, 55055],
      [243726, 55055],
      [609350, 187491],
      [609351, 187491]
    ]
    amounts.forEach(([amount, tax]) => {
      expectTax(FilingStatus.MFS, amount, tax)
    })
  })

  it('ordinary taxes for head of household status should be correct', async () => {
    const rows = await getTaxTable()
    rows.forEach(([min, lessThan, , , , tax]) => {
      expectTaxUnder100KRange(FilingStatus.HOH, min, lessThan - 0.01, tax)
    })

    // Over $100,000
    const amounts = [
      [100000, 15175],
      [100001, 15175],
      [100500, 15285],
      [100501, 15285],
      [191950, 37176],
      [191951, 37176],
      [243700, 53308],
      [243701, 53308],
      [609350, 181082],
      [609351, 181082]
    ]
    amounts.forEach(([amount, tax]) => {
      expectTax(FilingStatus.HOH, amount, tax)
    })
  })
})
