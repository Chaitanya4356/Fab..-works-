import { expect, test, type Page } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const costLine = (page: Page, n: number) => page.getByRole('group', { name: `Cost line ${n}` })
const item = (page: Page, n: number) => page.getByRole('group', { name: `Item ${n}` })

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('price a ₹1,00,000 cost sheet at 15% as one lump sum (E10)', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Test Traders' })
  await page.goto(`/customers/${customerId}`)
  await page.getByRole('link', { name: 'New quotation' }).click()
  await expect(page.getByLabel('Customer')).toHaveValue(customerId)
  await page.getByLabel('Title').fill('Warehouse shed 40x80')
  await expect(page.getByLabel('Margin (%)')).toHaveValue('15')
  const lines = [['Material', 'Steel sections', '60000'], ['Labour', 'Fabrication and erection', '25000'],
    ['Painting', 'Primer and enamel', '10000'], ['Transport', 'Two trips', '5000']]
  for (const [i, [category, description, rate]] of lines.entries()) {
    await page.getByRole('button', { name: 'Add cost line' }).click()
    await costLine(page, i + 1).getByLabel('Category').selectOption({ label: category })
    await costLine(page, i + 1).getByLabel('Description').fill(description)
    await costLine(page, i + 1).getByLabel('Qty').fill('1')
    await costLine(page, i + 1).getByLabel('Cost rate (₹)').fill(rate)
  }
  await page.getByRole('button', { name: 'Price as one lump sum' }).click()
  await expect(item(page, 1).getByLabel('Description')).toHaveValue('Supply, fabrication and erection as per scope of work')
  await expect(item(page, 1).getByLabel('Rate (₹)')).toHaveValue('115000.00')
  const totals = page.getByRole('region', { name: 'Totals' })
  await expect(totals).toContainText('Cost ₹1,00,000.00')
  await expect(totals).toContainText('Price before GST ₹1,15,000.00')
  await expect(totals).toContainText('Profit ₹15,000.00 (13.04% of price)')
  await expect(totals).toContainText('Grand total ₹1,15,000.00')
  await page.getByRole('button', { name: 'Save quotation' }).click()

  await expect(page.getByRole('heading', { name: 'Warehouse shed 40x80' })).toBeVisible()
  await expect(page.getByText(/^QT\/\d{4}-\d{2}\/\d{4}$/)).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Totals' })).toContainText('Grand total ₹1,15,000.00')
  await expect(page.getByRole('region', { name: 'Totals' })).not.toContainText('Profit')
  await expect(page.getByRole('region', { name: 'Cost sheet' })).toContainText('Profit ₹15,000.00 (13.04% of price)')

  await page.goto(`/customers/${customerId}`)
  await expect(page.getByRole('link', { name: 'Warehouse shed 40x80' })).toBeVisible()
})

test('a quantity that is not a number is pointed out and nothing typed is lost', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Typo Traders' })
  await page.goto(`/quotes/new?customer=${customerId}`)
  await page.getByLabel('Title').fill('Main gate')
  await page.getByRole('button', { name: 'Add item' }).click()
  await item(page, 1).getByLabel('Description').fill('MS gate 10x6')
  await item(page, 1).getByLabel('Qty').fill('two')
  await item(page, 1).getByLabel('Rate (₹)').fill('18,500')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(item(page, 1).getByText('Enter a quantity, like 12 or 12.5.')).toBeVisible()
  await expect(item(page, 1).getByLabel('Rate (₹)')).toHaveValue('18,500')
  await expect(page).toHaveURL(/\/quotes\/new/)
})

test('a draft is changed and saved again under the same number', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Edit Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Staircase', items: [{ description: 'Spiral staircase', qty: 1, rate: 85000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Title').fill('Spiral staircase, 3 m')
  await item(page, 1).getByLabel('Rate (₹)').fill('90000')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByRole('heading', { name: 'Spiral staircase, 3 m' })).toBeVisible()
  await expect(page.getByText(quote.quoteNo, { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Totals' })).toContainText('Grand total ₹90,000.00')
})
