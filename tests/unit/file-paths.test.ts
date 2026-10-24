import { expect, it } from 'vitest'
import { buildObjectPath, safeFileName } from '@/modules/files/paths'

it('builds storage paths per owner', () => {
  expect(buildObjectPath({ kind: 'attachment', entityType: 'project', entityId: 'abc' }, 'Shed GA (rev 2).PDF', 'id1'))
    .toBe('project/abc/id1-shed-ga-rev-2.pdf')
  expect(buildObjectPath({ kind: 'logo' }, 'Logo.png', 'id2')).toBe('settings/logo/id2-logo.png')
})
it('makes file names safe and short', () => {
  expect(safeFileName('   ')).toBe('file')
  const long = safeFileName('x'.repeat(200) + '.jpg')
  expect(long.length).toBeLessThanOrEqual(80)
  expect(long.endsWith('.jpg')).toBe(true)
})
