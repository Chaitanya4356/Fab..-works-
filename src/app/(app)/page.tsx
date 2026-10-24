import { requireActiveUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await requireActiveUser()
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.fullName}</h1>
    </section>
  )
}
