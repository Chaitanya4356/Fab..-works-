import { SignOutButton } from '@/components/sign-out-button'

export default function MorePage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">More</h1>
      <div>
        <SignOutButton />
      </div>
    </section>
  )
}
