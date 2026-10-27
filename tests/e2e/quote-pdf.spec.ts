import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

test('a quotation opens as a PDF for logged-in users only', async ({ page, playwright }) => {
  const customerId = await createTestCustomer({ name: 'PDF Test Traders' })
  const quote = await createTestQuotation({ customerId, title: 'PDF shed', items: [{ description: 'Shed', qty: 1, rate: 115000 }] })
  await login(page, OWNER)

  const res = await page.request.get(`/api/pdf/quotation/${quote.id}`)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('application/pdf')
  expect(res.headers()['content-disposition']).toBe(`inline; filename="${quote.quoteNo.replaceAll('/', '-')}.pdf"`)
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-')

  expect((await page.request.get('/api/pdf/quotation/00000000-0000-0000-0000-000000000000')).status()).toBe(404)
  expect((await page.request.get(`/api/pdf/invoice/${quote.id}`)).status()).toBe(404)

  const visitor = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  const anonymous = await visitor.get(`/api/pdf/quotation/${quote.id}`, { maxRedirects: 0 })
  expect(anonymous.status()).toBe(307)
  expect(anonymous.headers()['location']).toMatch(/\/login$/)
  await visitor.dispose()

  await page.goto(`/quotes/${quote.id}`)
  await expect(page.getByRole('link', { name: 'PDF', exact: true })).toHaveAttribute('href', `/api/pdf/quotation/${quote.id}`)
})
