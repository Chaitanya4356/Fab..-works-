import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/format'
import { AttachmentList } from '@/modules/files/components/attachment-list'
import { listAttachments } from '@/modules/files/queries'
import { WorkerActiveToggle } from '@/modules/workers/components/worker-active-toggle'
import { TRADE_LABELS, teamDates, wageText, type PayType, type Trade } from '@/modules/workers/labels'
import { getWorker } from '@/modules/workers/queries'
import { listWorkerProjects } from '@/modules/workers/team-queries'

export default async function WorkerPage({ params }: PageProps<'/workers/[id]'>) {
  const { id } = await params
  const worker = await getWorker(id)
  if (!worker) notFound()
  const [projects, documents] = await Promise.all([listWorkerProjects(worker.id), listAttachments('worker', worker.id)])
  const isActive = worker.status === 'active'
  const emergency = [worker.emergency_contact_name, worker.emergency_contact_phone].filter(Boolean).join(' · ')

  const details: [string, React.ReactNode][] = [
    ['Mobile', worker.phone && <a href={`tel:+91${worker.phone}`}>{worker.phone}</a>],
    ['Other phone', worker.alt_phone && <a href={`tel:+91${worker.alt_phone}`}>{worker.alt_phone}</a>],
    ['Address', worker.address],
    ['Joining date', worker.joining_date && formatDate(worker.joining_date)],
    ['Experience', worker.experience_years !== null && `${worker.experience_years} years`],
    ['Wage', wageText(worker.pay_type as PayType | null, worker.pay_rate)],
    ['Skills', worker.skills],
    ['Emergency contact', emergency],
    ['Notes', worker.notes],
  ]

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{worker.full_name}</h1>
          {!isActive && <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">Switched off</span>}
        </div>
        {worker.trade && <p className="text-muted">{TRADE_LABELS[worker.trade as Trade]}</p>}
        {!isActive && <p className="text-sm text-muted">Switched off — not offered when adding to a project team.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/workers/${worker.id}/edit`} className="button-secondary">
          Edit
        </Link>
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
          <p className="text-muted">Not on any project yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded border border-line bg-surface">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <span className="font-mono text-xs text-muted">{p.projectNo}</span>
                <Link href={`/projects/${p.projectId}`} className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline">
                  {p.projectTitle}
                </Link>
                {p.role && <span className="text-sm">{p.role}</span>}
                <span className="text-sm text-muted">{teamDates(p.fromDate, p.toDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Documents</h2>
        <AttachmentList
          entityType="worker"
          entityId={worker.id}
          items={documents}
          hint="ID proof, certificates and photos. Photos are made smaller before upload; other files can be up to 10 MB."
        />
      </section>

      <WorkerActiveToggle id={worker.id} isActive={isActive} />
    </section>
  )
}
