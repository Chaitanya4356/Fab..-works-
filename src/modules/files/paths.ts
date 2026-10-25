/** Must match the check on public.attachments.entity_type. */
export const ATTACHMENT_ENTITY_TYPES = [
  'customer', 'supplier', 'worker', 'project', 'quotation', 'activity_update', 'purchase_bill', 'dispatch', 'expense',
] as const
export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number]

export type UploadTarget =
  | { kind: 'attachment'; entityType: AttachmentEntityType; entityId: string }
  | { kind: 'logo' }

const MAX_NAME = 80

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** A lower-case, dash-separated file name of at most 80 characters that keeps its extension. */
export function safeFileName(name: string): string {
  const trimmed = name.trim()
  const dot = trimmed.lastIndexOf('.')
  const ext = dot > 0 ? slug(trimmed.slice(dot + 1)).slice(0, 10) : ''
  const suffix = ext ? `.${ext}` : ''
  const base = slug(dot > 0 ? trimmed.slice(0, dot) : trimmed).slice(0, MAX_NAME - suffix.length).replace(/-+$/, '')
  return `${base || 'file'}${suffix}`
}

/** True only for a file directly inside this record's own folder: "{entityType}/{entityId}/{name}". */
export function attachmentPathBelongs(entityType: AttachmentEntityType, entityId: string, path: string): boolean {
  const folder = `${entityType}/${entityId}/`
  if (!path.startsWith(folder)) return false
  const name = path.slice(folder.length)
  return name !== '' && !name.includes('/') && !name.includes('..')
}

/** Where a file lives in the private "files" bucket. */
export function buildObjectPath(target: UploadTarget, fileName: string, id: string): string {
  const name = `${id}-${safeFileName(fileName)}`
  return target.kind === 'logo' ? `settings/logo/${name}` : `${target.entityType}/${target.entityId}/${name}`
}
