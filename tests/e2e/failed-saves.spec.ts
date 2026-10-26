import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, login } from './fixtures'

const UNEXPECTED = 'Something went wrong. Nothing was saved. Try again.'

test('a project save that cannot reach the server keeps what was typed', async ({ page }) => {
  await createTestCustomer({ name: 'Offline Test Customer' })
  await login(page, OWNER)
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Offline Test Customer' })
  await page.getByLabel('Title').fill('Roof over loading bay')
  await page.getByLabel('Contract value (₹)').fill('3,40,000')

  await page.route('**/projects/new', (route) =>
    route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue(),
  )
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText(UNEXPECTED)).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Roof over loading bay')
  await expect(page.getByLabel('Contract value (₹)')).toHaveValue('3,40,000')

  await page.unroute('**/projects/new')
  await page.getByRole('button', { name: 'Create project' }).click()
  // The project page may not be compiled yet on a fresh dev server.
  await expect(page.getByRole('heading', { name: 'Roof over loading bay' })).toBeVisible({ timeout: 15_000 })
})

test('a customer save that cannot reach the server keeps what was typed', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/customers/new')
  await page.getByLabel('Name').fill('Konark Industries')
  await page.getByLabel('Mobile').fill('9876512345')
  await page.route('**/customers/new', (route) =>
    route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue(),
  )
  await page.getByRole('button', { name: 'Save customer' }).click()
  await expect(page.getByText(UNEXPECTED)).toBeVisible()
  await expect(page.getByLabel('Name')).toHaveValue('Konark Industries')
  await expect(page.getByLabel('Mobile')).toHaveValue('9876512345')
})
