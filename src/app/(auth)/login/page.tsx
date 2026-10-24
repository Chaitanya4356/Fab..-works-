import type { Metadata } from 'next'
import { MESSAGES } from '@/lib/messages'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in · SteelFlow' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { reason } = await searchParams
  const notice = reason === 'switched-off' ? MESSAGES.switchedOff : undefined

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-oxide">SteelFlow</p>
        <h1 className="text-2xl font-semibold">Log in to SteelFlow</h1>
      </div>
      <LoginForm notice={notice} />
    </main>
  )
}
