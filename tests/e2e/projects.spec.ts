import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, login } from './fixtures'

const isoDaysFromToday = (days: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + days * 86_400_000))

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('create a project for a customer and find it in the list', async ({ page }) => {
  await createTestCustomer({ name: 'Lakshmi Agro' })
  await page.goto('/projects')
  await page.getByRole('link', { name: 'New project' }).click()
  await page.getByLabel('Customer').selectOption({ label: 'Lakshmi Agro' })
  await page.getByLabel('Title').fill('Warehouse shed 40x80')
  await page.getByLabel('Site address').fill('Shamshabad')
  await page.getByLabel('Due date').fill(isoDaysFromToday(30))
  await page.getByLabel('Contract value (₹)').fill('12,50,000')
  await page.getByLabel('Material (₹)').fill('6,00,000')
  await page.getByRole('button', { name: 'Create project' }).click()

  const number = page.getByText(/^PRJ\/\d{4}-\d{2}\/\d{4}$/)
  await expect(number).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Warehouse shed 40x80' })).toBeVisible()
  await expect(page.getByText('₹12,50,000.00')).toBeVisible()
  const projectNo = (await number.textContent())!

  await page.goto(`/projects?q=${encodeURIComponent(projectNo)}`)
  await expect(page.getByRole('row', { name: /Warehouse shed 40x80/ })).toContainText('Lakshmi Agro')
  await page.goto('/projects?q=lakshmi')
  await expect(page.getByRole('row', { name: /Warehouse shed 40x80/ })).toBeVisible()
})

test('a project past its due date is marked overdue until it is completed', async ({ page }) => {
  await createTestCustomer({ name: 'Ganesh Poultry' })
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Ganesh Poultry' })
  await page.getByLabel('Title').fill('Poultry shed roof')
  await page.getByLabel('Due date').fill(isoDaysFromToday(-1))
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText('Overdue', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('Completed')
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()
  await expect(page.getByText('Overdue', { exact: true })).toHaveCount(0)
})

test('a switched-off customer is not offered for new projects but stays on old ones', async ({ page }) => {
  await createTestCustomer({ name: 'Sunrise Cold Storage' })
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Sunrise Cold Storage' })
  await page.getByLabel('Title').fill('Cold store platform')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name: 'Cold store platform' })).toBeVisible()
  const projectUrl = page.url()

  await page.getByRole('link', { name: 'Sunrise Cold Storage' }).click()
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(page.getByText('Switched off', { exact: true })).toBeVisible()

  await page.goto('/projects/new')
  await expect(page.getByLabel('Customer').locator('option', { hasText: 'Sunrise Cold Storage' })).toHaveCount(0)
  await page.goto(projectUrl)
  await expect(page.getByRole('link', { name: 'Sunrise Cold Storage' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit' }).click()
  await expect(page.getByLabel('Customer')).toHaveValue(/.+/)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByRole('heading', { name: 'Cold store platform' })).toBeVisible()
})
