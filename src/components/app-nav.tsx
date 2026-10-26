'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/customers', label: 'Customers' },
  { href: '/projects', label: 'Projects' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/money', label: 'Money' },
  { href: '/more', label: 'More' },
]

/** One menu: a bottom bar on phones, a side column from 768 px. */
export function AppNav() {
  const pathname = usePathname()
  const isCurrent = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-t-0 md:pb-0"
    >
      <p className="hidden px-6 pb-2 pt-6 text-lg font-semibold md:block">SteelFlow</p>
      <ul className="grid grid-cols-6 md:flex md:flex-col md:gap-1 md:px-3">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className="flex min-h-14 items-center justify-center text-xs font-medium tracking-tight text-muted md:text-sm md:tracking-normal aria-[current=page]:text-oxide md:min-h-11 md:justify-start md:rounded md:px-3 md:aria-[current=page]:bg-ground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
