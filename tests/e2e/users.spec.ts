import { expect, test } from '@playwright/test'
import { OWNER, createTestUser, login } from './fixtures'

test('add a second user who can then log in', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings/users')
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByLabel('Full name').fill('Ravi Kumar')
  await page.getByLabel('Mobile').fill('9876543210')
  await page.getByLabel('Login email').fill('ravi@steelflow.test')
  await page.getByLabel('Password').fill('ravi-pass-26')
  await page.getByRole('button', { name: 'Save user' }).click()
  await expect(page.getByRole('row', { name: /Ravi Kumar/ })).toContainText('Active')
  await page.goto('/more')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, { email: 'ravi@steelflow.test', password: 'ravi-pass-26' })
  await expect(page).toHaveURL('/')
})

test('a login email can only be used once', async ({ page }) => {
  await createTestUser({ email: 'meena@steelflow.test', password: 'meena-pass-26', fullName: 'Meena' })
  await login(page, OWNER)
  await page.goto('/settings/users')
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByLabel('Full name').fill('Meena Again')
  await page.getByLabel('Login email').fill('meena@steelflow.test')
  await page.getByLabel('Password').fill('meena-pass-27')
  await page.getByRole('button', { name: 'Save user' }).click()
  await expect(page.getByText('A user with this login email already exists.')).toBeVisible()
})

test('switching a user off ends their access, even mid-session', async ({ browser }) => {
  await createTestUser({ email: 'arjun@steelflow.test', password: 'arjun-pass-26', fullName: 'Arjun Das' })
  // Two people at once, each in a browser of their own; both are closed even when a step fails.
  const arjunContext = await browser.newContext()
  const ownerContext = await browser.newContext()
  try {
    const arjun = await arjunContext.newPage()
    await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
    await expect(arjun).toHaveURL('/')

    const owner = await ownerContext.newPage()
    await login(owner, OWNER)
    await owner.goto('/settings/users')
    const row = owner.getByRole('row', { name: /Arjun Das/ })
    await row.getByRole('button', { name: 'Switch off' }).click()
    await row.getByRole('button', { name: 'Yes, switch off' }).click()
    await expect(row).toContainText('Switched off')

    // Moving around inside the app (no reload) must still notice the login was switched off.
    await arjun.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'More' }).click()
    await expect(arjun).toHaveURL(/\/login/)
    await expect(arjun.getByText('This login has been switched off. Ask another user to switch it back on.')).toBeVisible()
    await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
    await expect(arjun.getByText('This login has been switched off. Ask another user to switch it back on.')).toBeVisible()

    await row.getByRole('button', { name: 'Switch on' }).click()
    await expect(row).toContainText('Active')
    await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
    await expect(arjun).toHaveURL('/')
  } finally {
    await arjunContext.close()
    await ownerContext.close()
  }
})

test('your own row cannot be switched off', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings/users')
  const own = page.getByRole('row', { name: /Test Owner/ })
  await expect(own).toContainText('You')
  await expect(own.getByRole('button', { name: 'Switch off' })).toHaveCount(0)
})

test('reset someone’s password', async ({ page }) => {
  await createTestUser({ email: 'kiran@steelflow.test', password: 'kiran-pass-26', fullName: 'Kiran' })
  await login(page, OWNER)
  await page.goto('/settings/users')
  const row = page.getByRole('row', { name: /Kiran/ })
  await row.getByRole('button', { name: 'Reset password' }).click()
  await row.getByLabel('New password').fill('kiran-new-27')
  await row.getByRole('button', { name: 'Save password' }).click()
  await expect(row.getByText('Password changed. Tell Kiran the new one in person.')).toBeVisible()
  await page.goto('/more')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, { email: 'kiran@steelflow.test', password: 'kiran-new-27' })
  await expect(page).toHaveURL('/')
})
