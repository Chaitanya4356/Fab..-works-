import { expect, test } from '@playwright/test'
import { OWNER, login } from './fixtures'

test('a visitor who is not logged in is sent to the login screen', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Log in to SteelFlow' })).toBeVisible()
})

test('a wrong password gets a plain message', async ({ page }) => {
  await login(page, { email: OWNER.email, password: 'not-the-password' })
  await expect(page.getByText('Wrong email or password.')).toBeVisible()
})

test('the owner logs in, uses the phone menu and logs out', async ({ page }) => {
  await login(page, OWNER)
  await expect(page).toHaveURL('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  for (const label of ['Home', 'Projects', 'Quotes', 'Money', 'More']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
  expect((await nav.getByRole('link', { name: 'Home' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await nav.getByRole('link', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })
  test('the menu sits down the side', async ({ page }) => {
    await login(page, OWNER)
    const box = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!
    expect(box.x).toBeLessThan(10)
    expect(box.height).toBeGreaterThan(400)
  })
})

test('the app can be added to the home screen', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'SteelFlow', short_name: 'SteelFlow', display: 'standalone', start_url: '/' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
  expect((await request.get('/icons/512')).headers()['content-type']).toBe('image/png')
})
