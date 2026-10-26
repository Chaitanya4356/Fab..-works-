import { expect, test, type Page } from '@playwright/test'
import { OWNER, createTestCustomer, createTestProject, createTestWorker, login } from './fixtures'

const teamTab = (page: Page) => page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /^Team/ })
const istDay = (offset: number) => new Date(Date.now() + 5.5 * 3600_000 + offset * 86_400_000).toISOString().slice(0, 10)
const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('-')

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('build a project team and see it on the worker’s profile', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team Test Customer' })
  const shed = await createTestProject({ customerId, title: 'Team test shed' })
  const gate = await createTestProject({ customerId, title: 'Team test gate' })
  const ramesh = await createTestWorker({ fullName: 'Team Ramesh', trade: 'welder' })
  await createTestWorker({ fullName: 'Team Off Worker', trade: 'helper', status: 'inactive' })

  await page.goto(`/projects/${gate.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Ramesh · Welder' })
  await page.getByRole('button', { name: 'Add to team' }).click()
  await expect(teamTab(page)).toHaveText('Team (1)')

  await page.goto(`/projects/${shed.id}`)
  await teamTab(page).click()
  await expect(page.getByText('No one on the team yet.')).toBeVisible()
  const picker = page.getByLabel('Worker')
  await expect(picker.getByRole('option', { name: /Team Off Worker/ })).toHaveCount(0)
  await picker.selectOption({ label: `Team Ramesh · Welder · also on ${gate.projectNo}` })
  await page.getByLabel('Role').fill('Lead welder')
  await page.getByRole('button', { name: 'Add to team' }).click()

  const current = page.getByRole('list', { name: 'Current team' })
  await expect(current.getByRole('listitem').filter({ hasText: 'Team Ramesh' })).toContainText('Lead welder')
  expect((await current.getByRole('link', { name: 'Team Ramesh' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect(teamTab(page)).toHaveText('Team (1)')
  await expect(picker.getByRole('option', { name: /Team Ramesh/ })).toHaveCount(0)

  await page.goto(`/workers/${ramesh}`)
  await expect(page.getByRole('link', { name: 'Team test shed' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Team test gate' })).toBeVisible()
})

test('take a worker off the team; a last day before they joined is refused', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team End Customer' })
  const project = await createTestProject({ customerId, title: 'Team end shed' })
  await createTestWorker({ fullName: 'Team Leaving Worker', trade: 'fitter' })
  const joins = istDay(3)

  await page.goto(`/projects/${project.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Leaving Worker · Fitter' })
  await page.getByLabel('From').fill(joins)
  await page.getByRole('button', { name: 'Add to team' }).click()

  const row = page.getByRole('list', { name: 'Current team' }).getByRole('listitem').filter({ hasText: 'Team Leaving Worker' })
  await row.getByRole('button', { name: 'Take off team' }).click()
  await expect(row.getByLabel('Last day')).toHaveValue(istDay(0))
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(row.getByText(`The last day cannot be before ${ddmmyyyy(joins)}, when they joined the team.`)).toBeVisible()

  await row.getByLabel('Last day').fill(joins)
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('list', { name: 'Earlier on this project' })).toContainText('Team Leaving Worker')
  await expect(teamTab(page)).toHaveText('Team')
})

test('adding the same worker from two screens puts them on the team once', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Team Twice Customer' })
  const project = await createTestProject({ customerId, title: 'Team twice shed' })
  await createTestWorker({ fullName: 'Team Twice Worker', trade: 'painter' })
  const other = await context.newPage()

  for (const p of [page, other]) {
    await p.goto(`/projects/${project.id}/team`)
    await p.getByLabel('Worker').selectOption({ label: 'Team Twice Worker · Painter' })
  }
  await page.getByRole('button', { name: 'Add to team' }).click()
  await expect(teamTab(page)).toHaveText('Team (1)')
  await other.getByRole('button', { name: 'Add to team' }).click()
  await expect(other.getByText('Team Twice Worker is already on this team.')).toBeVisible()

  await other.reload()
  await expect(other.getByRole('list', { name: 'Current team' }).getByRole('listitem')).toHaveCount(1)
})

test('a worker switched off later stays on the team, marked switched off', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team Off Customer' })
  const project = await createTestProject({ customerId, title: 'Team off shed' })
  const worker = await createTestWorker({ fullName: 'Team Later Off', trade: 'helper' })

  await page.goto(`/projects/${project.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Later Off · Helper' })
  await page.getByRole('button', { name: 'Add to team' }).click()

  await page.goto(`/workers/${worker}`)
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()

  await page.goto(`/projects/${project.id}/team`)
  const row = page.getByRole('list', { name: 'Current team' }).getByRole('listitem').filter({ hasText: 'Team Later Off' })
  await expect(row).toContainText('Switched off')
  await expect(page.getByLabel('Worker').getByRole('option', { name: /Team Later Off/ })).toHaveCount(0)
})
