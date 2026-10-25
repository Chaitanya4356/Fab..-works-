'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** The project page's sections. Later stages add their own tabs here. */
export function ProjectTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Project sections" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab, i) => {
        const current = i === 0 ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? 'page' : undefined}
            className="flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted aria-[current=page]:border-oxide aria-[current=page]:text-ink"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
