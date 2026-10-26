import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const E10_COSTS = [
  { category: 'material', description: 'Steel', qty: 1, costRate: 60000 },
  { category: 'labour', description: 'Fabrication', qty: 1, costRate: 25000 },
  { category: 'painting', description: 'Paint', qty: 1, costRate: 10000 },
  { category: 'transport', description: 'Trips', qty: 1, costRate: 5000 },
]

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('an accepted quotation becomes a project with its price and estimates', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Convert Test Traders' })
  const quote = await createTestQuotation({
    customerId, title: 'Convert shed', scope: 'Shed 40x80 with sheeting', costLines: E10_COSTS,
    items: [{ description: 'Supply, fabrication and erection as per scope of work', qty: 1, rate: 115000, unit: 'job' }], status: 'accepted',
  })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Make project' }).click()
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Convert shed' })).toBeVisible()
  for (const amount of ['₹1,15,000.00', '₹60,000.00', '₹25,000.00', '₹10,000.00', '₹5,000.00']) {
    await expect(page.getByText(amount, { exact: true })).toBeVisible()
  }
  await expect(page.getByText('Shed 40x80 with sheeting')).toBeVisible()

  await page.getByRole('link', { name: quote.quoteNo }).click()
  await expect(page.getByRole('link', { name: /^Project PRJ\// })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Make project' })).toHaveCount(0)
})

test('making a project from two screens makes one project', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Twice Convert Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Twice shed', items: [{ description: 'Shed', qty: 1, rate: 70000 }], status: 'accepted' })
  const other = await context.newPage()
  await page.goto(`/quotes/${quote.id}`)
  await other.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Make project' }).click()
  await expect(page).toHaveURL(/\/projects\//)
  await other.getByRole('button', { name: 'Make project' }).click()
  await expect(other.getByText(/^This quotation is already project PRJ\/.+\.$/)).toBeVisible()
})
