import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestCustomers, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('add a customer, find them by name or phone, and edit them', async ({ page }) => {
  await page.goto('/customers')
  await page.getByRole('link', { name: 'New customer' }).click()
  await page.getByLabel('Name').fill('Sharma Steel Traders')
  await page.getByLabel('Contact person').fill('Ravi Sharma')
  await page.getByLabel('Mobile').fill('98765 43210')
  await page.getByLabel('City').fill('Hyderabad')
  await page.getByLabel('State').selectOption('Telangana')
  await page.getByRole('button', { name: 'Save customer' }).click()
  await expect(page.getByRole('heading', { name: 'Sharma Steel Traders' })).toBeVisible()
  await expect(page.getByText('9876543210')).toBeVisible()

  for (const query of ['sharma', '43210']) {
    await page.goto(`/customers?q=${encodeURIComponent(query)}`)
    await expect(page.getByRole('row', { name: /Sharma Steel Traders/ })).toBeVisible()
  }
  await page.goto('/customers?q=zzz')
  await expect(page.getByText('No customers match “zzz”.')).toBeVisible()

  await page.goto('/customers')
  await page.getByRole('row', { name: /Sharma Steel Traders/ }).getByRole('link', { name: 'Sharma Steel Traders' }).click()
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('City').fill('Secunderabad')
  await page.getByRole('button', { name: 'Save customer' }).click()
  await expect(page.getByText('Secunderabad')).toBeVisible()
})

test('search text with commas or brackets does not break the list', async ({ page }) => {
  await createTestCustomer({ name: 'Hyderabad Sheds' })
  await page.goto('/customers')
  await page.getByLabel('Search').fill('Sharma, (Hyd)')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  await expect(page.getByText('No customers match “Sharma, (Hyd)”.')).toBeVisible()
})

test('switching a customer off moves them to the switched-off list', async ({ page }) => {
  const id = await createTestCustomer({ name: 'Old Mill Works' })
  await page.goto(`/customers/${id}`)
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(page.getByText('Switched off', { exact: true })).toBeVisible()
  await page.goto('/customers')
  await expect(page.getByRole('row', { name: /Old Mill Works/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Show switched-off customers' }).click()
  await expect(page.getByRole('row', { name: /Old Mill Works/ })).toBeVisible()
})

test('the customer list pages 50 at a time', async ({ page }) => {
  await createTestCustomers(Array.from({ length: 55 }, (_, i) => `Paging Customer ${String(i + 1).padStart(2, '0')}`))
  await page.goto('/customers?q=Paging')
  await expect(page.getByText('Showing 1–50 of 55')).toBeVisible()
  await page.getByRole('link', { name: 'Next' }).click()
  await expect(page.getByText('Showing 51–55 of 55')).toBeVisible()
  await page.goto('/customers?q=Paging&page=99')
  await expect(page.getByText('Showing 51–55 of 55')).toBeVisible()
  await page.goto('/customers?q=Paging&page=abc')
  await expect(page.getByText('Showing 1–50 of 55')).toBeVisible()
})

test('an exact name with brackets or an apostrophe is found', async ({ page }) => {
  await createTestCustomer({ name: 'Sai Steels (P) Ltd' })
  await createTestCustomer({ name: "D'Souza Fabricators" })
  for (const query of ['Sai Steels (P) Ltd', "D'Souza"]) {
    await page.goto(`/customers?q=${encodeURIComponent(query)}`)
    await expect(page.getByRole('row', { name: query })).toBeVisible()
  }
})
