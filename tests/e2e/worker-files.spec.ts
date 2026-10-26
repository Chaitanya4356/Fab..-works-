import { expect, test } from '@playwright/test'
import { OWNER, TEST_PDF, countStoredFiles, createTestWorker, login } from './fixtures'

test('keep a worker’s ID proof on their profile, then remove it', async ({ page }) => {
  const id = await createTestWorker({ fullName: 'Documents Test Worker' })
  await login(page, OWNER)
  await page.goto(`/workers/${id}`)
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()
  await expect(page.getByText(/^ID proof, certificates and photos\./)).toBeVisible()

  await page.getByLabel('Add photo or file').setInputFiles({ name: 'Aadhaar card.pdf', mimeType: 'application/pdf', buffer: TEST_PDF })
  await expect(page.getByRole('link', { name: 'Aadhaar card.pdf' })).toBeVisible()
  await expect.poll(() => countStoredFiles(`worker/${id}`)).toBe(1)

  await page.getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(page.getByText('No files yet.')).toBeVisible()
  await expect.poll(() => countStoredFiles(`worker/${id}`)).toBe(0)
})
