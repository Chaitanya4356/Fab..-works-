import { AppNav } from '@/components/app-nav'
import { requireActiveUser } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireActiveUser()
  return (
    <div className="min-h-dvh md:flex">
      <AppNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
    </div>
  )
}
