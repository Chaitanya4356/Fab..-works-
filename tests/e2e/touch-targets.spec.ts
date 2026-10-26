import { expect, test, type Locator } from '@playwright/test'
import { OWNER, createTestCustomer, login } from './fixtures'

const tall = async (locator: Locator) => expect((await locator.boundingBox())!.height).toBeGreaterThanOrEqual(44)

test('the new list and form controls are big enough to tap on a phone', async ({ page }) => {
  await createTestCustomer({ name: 'Tap Target Traders', phone: '9876500000' })
  await login(page, OWNER)

  await page.goto('/customers')
  await tall(page.getByRole('link', { name: 'Show switched-off customers' }))
  // Searched for, so customers added by earlier tests cannot push it to page 2.
  await page.goto('/customers?q=Tap+Target')
  const row = page.getByRole('row', { name: /Tap Target Traders/ })
  await tall(row.getByRole('link', { name: 'Tap Target Traders' }))
  await tall(row.getByRole('link', { name: '9876500000' }))

  await page.goto('/projects')
  const views = page.getByRole('navigation', { name: 'Project views' })
  for (const label of ['Open', 'Completed', 'Cancelled', 'All']) await tall(views.getByRole('link', { name: label }))

  await page.goto('/projects/new')
  await tall(page.getByRole('link', { name: 'Add a new customer' }))
  await page.getByLabel('Customer').selectOption({ label: 'Tap Target Traders' })
  await page.getByLabel('Title').fill('Tap target shed')
  await page.getByRole('button', { name: 'Create project' }).click()
  await tall(page.getByRole('link', { name: 'Tap Target Traders' }))

  await page.goto('/projects?q=Tap+target')
  await tall(page.getByRole('row', { name: /Tap target shed/ }).getByRole('link', { name: 'Tap target shed' }))
})
