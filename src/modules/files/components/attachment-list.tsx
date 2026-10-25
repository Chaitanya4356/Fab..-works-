'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatBytes, formatDate } from '@/lib/format'
import { uploadFile } from '@/lib/upload/upload-file'
import { recordAttachment, removeAttachment } from '../actions'
import type { AttachmentEntityType } from '../paths'
import type { AttachmentRow } from '../queries'

export function AttachmentList({
  entityType,
  entityId,
  items,
}: {
  entityType: AttachmentEntityType
  entityId: string
  items: AttachmentRow[]
}) {
  const router = useRouter()
  const [progress, setProgress] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    startTransition(async () => {
      const problems: string[] = []
      for (const [i, file] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        const uploaded = await uploadFile(file, { kind: 'attachment', entityType, entityId })
        if (!uploaded.ok) {
          problems.push(`${file.name}: ${uploaded.message}`)
          continue
        }
        const recorded = await recordAttachment({
          entityType,
          entityId,
          path: uploaded.path,
          fileName: uploaded.name,
          mimeType: uploaded.type || null,
          sizeBytes: uploaded.size,
        })
        if (!recorded.ok) problems.push(`${file.name}: ${recorded.message}`)
      }
      setProgress(null)
      setErrors(problems)
      router.refresh()
    })
  }

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await removeAttachment(id)
      setConfirming(null)
      setErrors(result.ok ? [] : [result.message])
      router.refresh()
    })

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Add photo or file
        <input
          type="file"
          multiple
          accept="image/*,application/pdf,.dwg,.dxf"
          onChange={choose}
          disabled={pending}
          className="text-sm"
        />
      </label>
      <p className="text-sm text-muted">
        Drawings, site photos and documents. Photos are made smaller before upload; other files can be up to 10 MB.
      </p>
      {progress && <p className="text-sm text-muted">{progress}</p>}
      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-oxide">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="text-muted">No files yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded border border-line bg-surface p-3">
              {item.isImage && item.url ? (
                // A short-lived signed link from private storage, so next/image (fixed remote hosts) is not used.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.fileName} className="h-20 w-20 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-ground text-xs font-medium uppercase text-muted">
                  {item.fileName.split('.').pop()}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="break-words font-medium underline-offset-4 hover:underline">
                    {item.fileName}
                  </a>
                ) : (
                  <span className="break-words font-medium">{item.fileName}</span>
                )}
                <span className="text-xs text-muted">
                  {item.sizeBytes !== null && `${formatBytes(item.sizeBytes)} · `}
                  {formatDate(item.createdAt)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {confirming === item.id ? (
                    <>
                      <button type="button" disabled={pending} className="button-primary bg-oxide" onClick={() => remove(item.id)}>
                        Yes, remove
                      </button>
                      <button type="button" className="button-secondary" onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" className="button-secondary" onClick={() => setConfirming(item.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
