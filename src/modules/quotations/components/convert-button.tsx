'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { convertQuotation } from '../actions'

export function ConvertButton({ quotationId }: { quotationId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const convert = () =>
    startTransition(async () => {
      const result = await runAction(() => convertQuotation(quotationId))
      if (result.ok) router.push(`/projects/${result.data.projectId}`)
      else setMessage(result.message)
    })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button type="button" disabled={pending} className="button-primary" onClick={convert}>
          {pending ? 'Making project…' : 'Make project'}
        </button>
      </div>
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
