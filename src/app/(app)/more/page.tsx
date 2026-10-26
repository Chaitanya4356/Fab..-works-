import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { requireActiveUser } from '@/lib/auth'

// Workers is in the side menu on wide screens, so More lists it on phones only.
const LINKS: { href: string; label: string; phoneOnly?: boolean }[] = [
  { href: '/workers', label: 'Workers', phoneOnly: true },
  { href: '/settings', label: 'Settings' },
  { href: '/settings/users', label: 'Users' },
]

export default async function MorePage() {
  await requireActiveUser()
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">More</h1>
      <ul className="flex flex-col divide-y divide-line rounded border border-line bg-surface">
        {LINKS.map((link) => (
          <li key={link.href} className={link.phoneOnly ? 'md:hidden' : undefined}>
            <Link href={link.href} className="flex min-h-12 items-center px-4 font-medium">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <div>
        <SignOutButton />
      </div>
    </section>
  )
}
