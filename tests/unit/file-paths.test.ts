import { expect, it } from 'vitest'
import { attachmentPathBelongs, buildObjectPath, safeFileName } from '@/modules/files/paths'

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
it('only accepts a file path inside that record’s own folder', () => {
  const id = 'b0000000-0000-0000-0000-000000000001'
  expect(attachmentPathBelongs('project', id, `project/${id}/a1-shed-ga.pdf`)).toBe(true)
  expect(attachmentPathBelongs('project', id, `project/b0000000-0000-0000-0000-000000000002/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `customer/${id}/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `project/${id}/../other/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `project/${id}/sub/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, 'settings/logo/a1.png')).toBe(false)
})
