import { expect, test } from '@playwright/test'
import { OWNER, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings')
})

test('workshop details are kept after saving', async ({ page }) => {
  await page.getByLabel('Workshop name').fill('Sri Balaji Fabricators')
  await page.getByLabel('State').selectOption('Telangana')
  await page.getByLabel('PIN code').fill('500018')
  await page.getByLabel('UPI ID').fill('balajifab@okhdfcbank')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Workshop name')).toHaveValue('Sri Balaji Fabricators')
  await expect(page.getByLabel('State')).toHaveValue('Telangana')
  await expect(page.getByLabel('UPI ID')).toHaveValue('balajifab@okhdfcbank')
})

test('GST cannot be switched on without a GSTIN', async ({ page }) => {
  await page.getByLabel('Workshop name').fill('Sri Balaji Fabricators')
  await page.getByLabel('Charge GST on invoices').check()
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Enter your GSTIN to switch GST on.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Charge GST on invoices')).not.toBeChecked()
})

test('a large logo is shrunk before upload', async ({ page }) => {
  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 3000
    c.height = 2000
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#A2412A'
    ctx.fillRect(0, 0, 3000, 2000)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.getByLabel('Logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png) })
  const img = page.getByRole('img', { name: 'Workshop logo' })
  await expect(img).toBeVisible()
  expect(await img.evaluate((el: HTMLImageElement) => Math.max(el.naturalWidth, el.naturalHeight))).toBeLessThanOrEqual(600)
})

test('invoice numbers can carry on from the bill book', async ({ page }) => {
  const invoice = page.getByRole('group', { name: 'Invoice numbers' })
  await invoice.getByLabel('Prefix').fill('sbf')
  await invoice.getByLabel('Digits').fill('3')
  await invoice.getByLabel('Next number').fill('246')
  await expect(invoice.getByText(/^Next: SBF\/\d{4}-\d{2}\/246$/)).toBeVisible()
  await page.getByRole('button', { name: 'Save numbering' }).click()
  await expect(page.getByText('Numbering saved')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('group', { name: 'Invoice numbers' }).getByText(/^Next: SBF\/\d{4}-\d{2}\/246$/)).toBeVisible()
})

test('a long invoice format gets a GST warning', async ({ page }) => {
  const invoice = page.getByRole('group', { name: 'Invoice numbers' })
  await invoice.getByLabel('Prefix').fill('SBFAB-INV')
  await invoice.getByLabel('Digits').fill('4')
  await expect(invoice.getByText('GST invoice numbers can have at most 16 characters. This format makes 22.')).toBeVisible()
})

test('storage use is shown against the free limits', async ({ page }) => {
  await expect(page.getByText(/^Files: .+ of 1 GB$/)).toBeVisible()
  await expect(page.getByText(/^Database: .+ of 500 MB$/)).toBeVisible()
})

test('GST cannot be switched on while invoice numbers are too long for GST', async ({ page }) => {
  const invoice = page.getByRole('group', { name: 'Invoice numbers' })
  await invoice.getByLabel('Prefix').fill('SBFAB-INV')
  await invoice.getByLabel('Digits').fill('4')
  await page.getByRole('button', { name: 'Save numbering' }).click()
  await expect(page.getByText('Numbering saved')).toBeVisible()

  await page.getByLabel('Workshop name').fill('Sri Balaji Fabricators')
  await page.getByLabel('State').selectOption('Telangana')
  await page.getByLabel('GSTIN').fill('36ABCDE1234F1Z5')
  await page.getByLabel('Charge GST on invoices').check()
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(
    page.getByText(/GST invoice numbers can have at most 16 characters\. This format makes \d+\. Shorten the invoice number format first\./),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Charge GST on invoices')).not.toBeChecked()
})
