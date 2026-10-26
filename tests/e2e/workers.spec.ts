import { expect, test } from '@playwright/test'
import { OWNER, createTestWorker, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('add a worker, find them by name, mobile or trade, and edit them', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'More' }).click()
  await page.getByRole('main').getByRole('link', { name: 'Workers' }).click()
  await page.getByRole('link', { name: 'New worker' }).click()
  await page.getByLabel('Full name').fill('Ramesh Kumar')
  await page.getByLabel('Trade').selectOption({ label: 'Welder' })
  await page.getByLabel('Mobile', { exact: true }).fill('98765 00001')
  await page.getByLabel('Joining date').fill('2026-04-01')
  await page.getByLabel('Experience (years)').fill('5.5')
  await page.getByLabel('Pay type').selectOption({ label: 'Daily' })
  await page.getByLabel('Pay rate (₹)').fill('650')
  await page.getByRole('button', { name: 'Save worker' }).click()

  await expect(page.getByRole('heading', { name: 'Ramesh Kumar' })).toBeVisible()
  await expect(page.getByText('₹650.00 per day')).toBeVisible()
  await expect(page.getByText('01-04-2026')).toBeVisible()
  await expect(page.getByText('5.5 years')).toBeVisible()

  for (const q of ['ramesh', '+91 98765 00001', 'weld']) {
    await page.goto(`/workers?q=${encodeURIComponent(q)}`)
    const link = page.getByRole('link', { name: 'Ramesh Kumar' })
    await expect(link).toBeVisible()
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }

  await page.getByRole('link', { name: 'Ramesh Kumar' }).click()
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Pay rate (₹)').fill('700')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('₹700.00 per day')).toBeVisible()
})

test('a bad entry keeps what was typed and says what to fix', async ({ page }) => {
  await page.goto('/workers/new')
  await page.getByLabel('Full name').fill('Imran Khan')
  await page.getByLabel('Experience (years)').fill('5.55')
  await page.getByLabel('Pay rate (₹)').fill('650')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('Enter years of experience, like 5 or 5.5.')).toBeVisible()
  await expect(page.getByLabel('Full name')).toHaveValue('Imran Khan')

  await page.getByLabel('Experience (years)').fill('5')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('Choose daily, hourly or monthly.')).toBeVisible()
})

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })
  test('Workers has its own item in the side menu', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('link', { name: 'Workers' }).click()
    await expect(page.getByRole('heading', { name: 'Workers' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Workers' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('link', { name: 'More' }).click()
    await expect(page.getByRole('main').getByRole('link', { name: 'Workers' })).toHaveCount(0)
  })
})

test('a worker who is switched off leaves the list but keeps their record', async ({ page }) => {
  await createTestWorker({ fullName: 'Suresh Babu', trade: 'helper' })
  await page.goto('/workers?q=Suresh')
  await page.getByRole('link', { name: 'Suresh Babu' }).click()
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(page.getByText('Switched off — not offered when adding to a project team.')).toBeVisible()

  await page.goto('/workers?q=Suresh')
  await expect(page.getByText('No workers match “Suresh”.')).toBeVisible()
  await page.goto('/workers?show=off&q=Suresh')
  await expect(page.getByRole('link', { name: 'Suresh Babu' })).toBeVisible()
})
