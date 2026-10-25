import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CustomerActiveToggle } from '@/modules/customers/components/customer-active-toggle'
import { getCustomer } from '@/modules/customers/queries'
import { OverduePill, StatusPill } from '@/modules/projects/components/status-pill'
import { listCustomerProjects } from '@/modules/projects/queries'

export default async function CustomerPage({ params }: PageProps<'/customers/[id]'>) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()
  const projects = await listCustomerProjects(customer.id)

  const details: [string, React.ReactNode][] = [
    ['Contact person', customer.contact_person],
    ['Mobile', customer.phone && <a href={`tel:+91${customer.phone}`}>{customer.phone}</a>],
    ['Other phone', customer.alt_phone && <a href={`tel:+91${customer.alt_phone}`}>{customer.alt_phone}</a>],
    ['Email', customer.email],
    ['Address', customer.address],
    ['City', customer.city],
    ['State', customer.state],
    ['PIN code', customer.pincode],
    ['GSTIN', customer.gstin],
    ['Notes', customer.notes],
  ]

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          {!customer.is_active && (
            <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">Switched off</span>
          )}
        </div>
        {!customer.is_active && (
          <p className="text-sm text-muted">Switched off — not offered when starting a new project.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/customers/${customer.id}/edit`} className="button-secondary">
          Edit
        </Link>
        {customer.is_active && (
          <Link href={`/projects/new?customer=${customer.id}`} className="button-secondary">
            New project
          </Link>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded border border-line bg-surface p-4 sm:grid-cols-2">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
              <dd className="whitespace-pre-line">{value}</dd>
            </div>
          ))}
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-muted">No projects yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded border border-line bg-surface">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-mono text-xs text-muted">{p.projectNo}</span>
                <Link href={`/projects/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                  {p.title}
                </Link>
                <StatusPill status={p.status} />
                {p.isOverdue && <OverduePill />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerActiveToggle id={customer.id} isActive={customer.is_active} />
    </section>
  )
}
