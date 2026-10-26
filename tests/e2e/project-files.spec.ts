import { expect, test } from '@playwright/test'
import { OWNER, TEST_PDF, countStoredFiles, createTestCustomer, login } from './fixtures'

test('attach a drawing and a site photo to a project, then remove one', async ({ page }) => {
  await createTestCustomer({ name: 'Files Test Customer' })
  await login(page, OWNER)
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Files Test Customer' })
  await page.getByLabel('Title').fill('Mezzanine floor')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name: 'Mezzanine floor' })).toBeVisible()
  const projectId = new URL(page.url()).pathname.split('/')[2]

  await page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /Files/ }).click()
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'Mezzanine GA.pdf', mimeType: 'application/pdf', buffer: TEST_PDF })
  await expect(page.getByText('Mezzanine GA.pdf')).toBeVisible()

  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 3000
    c.height = 2000
    c.getContext('2d')!.fillRect(0, 0, 3000, 2000)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'site-photo.png', mimeType: 'image/png', buffer: Buffer.from(png) })
  const photo = page.getByRole('img', { name: 'site-photo.jpg' })
  await expect(photo).toBeVisible()
  expect(await photo.evaluate((el: HTMLImageElement) => Math.max(el.naturalWidth, el.naturalHeight))).toBeLessThanOrEqual(1600)
  expect(await countStoredFiles(`project/${projectId}`)).toBe(2)

  await page.getByRole('listitem').filter({ hasText: 'Mezzanine GA.pdf' }).getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(page.getByText('Mezzanine GA.pdf')).toHaveCount(0)
  await expect.poll(() => countStoredFiles(`project/${projectId}`)).toBe(1)
})

test('a file type SteelFlow cannot use is refused with a reason', async ({ page }) => {
  await createTestCustomer({ name: 'Files Test Customer 2' })
  await login(page, OWNER)
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Files Test Customer 2' })
  await page.getByLabel('Title').fill('Canopy')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name: 'Canopy' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /Files/ }).click()
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('x') })
  await expect(page.getByText(/notes\.docx: This file type isn't supported\./)).toBeVisible()
})
