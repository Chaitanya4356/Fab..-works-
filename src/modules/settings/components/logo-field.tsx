'use client'

import { useState, useTransition } from 'react'
import { uploadFile } from '@/lib/upload/upload-file'
import { getFileUrl } from '@/modules/files/actions'
import { removeLogo, setLogo } from '../actions'

export function LogoField({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    startTransition(async () => {
      setMessage(null)
      const uploaded = await uploadFile(file, { kind: 'logo' }, { maxSide: 600 })
      if (!uploaded.ok) return setMessage(uploaded.message)
      const saved = await setLogo(uploaded.path)
      if (!saved.ok) return setMessage(saved.message)
      const link = await getFileUrl(uploaded.path)
      if (!link.ok) return setMessage(link.message)
      setUrl(link.data.url)
    })
  }

  const remove = () =>
    startTransition(async () => {
      const result = await removeLogo()
      if (result.ok) setUrl(null)
      else setMessage(result.message)
    })

  return (
    <div className="flex flex-col gap-3">
      {url && (
        // A short-lived signed link from private storage, so next/image (which needs fixed remote hosts) is not used.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Workshop logo" className="h-24 w-auto self-start rounded border border-line bg-surface object-contain p-2" />
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Logo
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} disabled={pending} className="text-sm" />
      </label>
      <p className="text-sm text-muted">Printed on quotations and invoices. Large images are made smaller before upload.</p>
      {url && (
        <div>
          <button type="button" onClick={remove} disabled={pending} className="button-secondary">
            Remove logo
          </button>
        </div>
      )}
      {pending && <p className="text-sm text-muted">Uploading…</p>}
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
