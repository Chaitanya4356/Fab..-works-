'use client'

import { useActionState, useState } from 'react'
import { signIn } from './actions'

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(signIn, null)
  const [email, setEmail] = useState('')
  const message = state && !state.ok ? state.message : notice

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {message && (
        <p role="alert" className="rounded border border-oxide/40 bg-oxide/10 px-3 py-2 text-sm text-oxide">
          {message}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      <button type="submit" disabled={pending} className="button-primary">
        {pending ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}
