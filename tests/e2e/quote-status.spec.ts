import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('send, follow up, revise and accept a quotation', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Status Test Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Status test shed', items: [{ description: 'Shed', qty: 1, rate: 50000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Sent', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

  await page.getByLabel('Follow up on').fill(istToday())
  await page.getByRole('button', { name: 'Save follow-up date' }).click()
  await page.goto('/quotes?view=follow_up')
  const row = page.getByRole('row', { name: /Status test shed/ })
  await expect(row).toContainText('Follow up')

  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Revise' }).click()
  await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+\/edit$/)
  await page.getByRole('group', { name: 'Item 1' }).getByLabel('Rate (₹)').fill('48000')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByText(`${quote.quoteNo}-R1`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await page.getByRole('button', { name: 'Mark accepted' }).click()
  await expect(page.getByText('Accepted', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Revisions' }).getByRole('listitem')).toHaveCount(2)

  await page.goto(`/quotes/${quote.id}`)
  await expect(page.getByText('Replaced', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: `${quote.quoteNo}-R1` }).first()).toBeVisible()
})

test('a sent quotation cannot be edited from a tab left open', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Old Tab Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Old tab gate', items: [{ description: 'Gate', qty: 1, rate: 20000 }] })
  await page.goto(`/quotes/${quote.id}/edit`)
  const other = await context.newPage()
  await other.goto(`/quotes/${quote.id}`)
  await other.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(other.getByText('Sent', { exact: true })).toBeVisible()

  await page.getByLabel('Title').fill('Old tab gate, changed')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByText('This quotation has been sent, so it can no longer be edited. Revise it to make changes.')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Old tab gate, changed')
})

test('reject with a reason, and close an enquiry that went nowhere', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Reject Test Traders' })
  const sent = await createTestQuotation({ customerId, title: 'Rejected shed', items: [{ description: 'Shed', qty: 1, rate: 40000 }], status: 'sent' })
  await page.goto(`/quotes/${sent.id}`)
  await page.getByRole('button', { name: 'Mark rejected' }).click()
  await page.getByLabel('Reason (optional)').fill('Price too high')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Rejected: Price too high')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revise' })).toBeVisible()

  const draft = await createTestQuotation({ customerId, title: 'Dead enquiry', items: [] })
  await page.goto(`/quotes/${draft.id}`)
  await page.getByRole('button', { name: 'Mark rejected' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible()
})

test('the list finds quotations by number, customer or title', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Findable Fabricators' })
  const quote = await createTestQuotation({ customerId, title: 'Mezzanine floor', items: [{ description: 'Floor', qty: 1, rate: 30000 }] })
  for (const q of [quote.quoteNo, 'Findable', 'mezzanine']) {
    await page.goto(`/quotes?view=all&q=${encodeURIComponent(q)}`)
    await expect(page.getByRole('link', { name: 'Mezzanine floor' })).toBeVisible()
  }
  const views = page.getByRole('navigation', { name: 'Quotation views' })
  for (const label of ['Open', 'Follow-ups due', 'Accepted', 'Rejected', 'All']) {
    expect((await views.getByRole('link', { name: label }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})
