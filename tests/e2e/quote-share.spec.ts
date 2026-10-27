import { expect, test } from '@playwright/test'
import { OWNER, countStoredFiles, createTestCustomer, createTestQuotation, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('where the phone cannot share files, WhatsApp opens with a 7-day link to the PDF', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })
    window.open = ((url: string) => { (window as unknown as { opened: string }).opened = url; return null }) as typeof window.open
  })
  const customerId = await createTestCustomer({ name: 'Share Test Traders', phone: '9876500111' })
  const quote = await createTestQuotation({ customerId, title: 'Share shed', items: [{ description: 'Shed', qty: 1, rate: 115000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()

  await expect.poll(() => page.evaluate(() => (window as unknown as { opened?: string }).opened ?? '')).toMatch(/^https:\/\/wa\.me\/919876500111\?text=/)
  const opened = await page.evaluate(() => (window as unknown as { opened: string }).opened)
  const text = decodeURIComponent(opened.split('?text=')[1])
  expect(text).toContain(`Quotation ${quote.quoteNo} from`)
  expect(text).toContain('₹1,15,000.00')
  expect(text).toContain(`/storage/v1/object/sign/files/share/quotation/${quote.id}/`)
  expect(await countStoredFiles(`share/quotation/${quote.id}`)).toBe(1)

  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()
  await expect.poll(() => countStoredFiles(`share/quotation/${quote.id}`)).toBe(1)
})

test('where the phone can share files, the PDF goes to the share sheet', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { shared: unknown }).shared = { names: data.files?.map((f) => f.name), types: data.files?.map((f) => f.type), text: data.text }
      },
    })
  })
  const customerId = await createTestCustomer({ name: 'Share Sheet Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Sheet shed', items: [{ description: 'Shed', qty: 1, rate: 50000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared?: unknown }).shared ?? null)).toEqual({
    names: [`${quote.quoteNo.replaceAll('/', '-')}.pdf`], types: ['application/pdf'],
    text: expect.stringContaining(`Quotation ${quote.quoteNo} from`),
  })
})

test('if the browser blocks the WhatsApp window, a link to open it is shown', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })
    window.open = (() => null) as typeof window.open
  })
  const customerId = await createTestCustomer({ name: 'Blocked Window Traders', phone: '9876500222' })
  const quote = await createTestQuotation({ customerId, title: 'Blocked window shed', items: [{ description: 'Shed', qty: 1, rate: 60000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()

  const link = page.getByRole('link', { name: 'Open WhatsApp' })
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/919876500222\?text=/)
  await expect(link).toHaveAttribute('target', '_blank')
})
