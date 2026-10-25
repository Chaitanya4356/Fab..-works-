import { notFound } from 'next/navigation'
import { formatDate, formatINR } from '@/lib/format'
import { ESTIMATE_FIELDS } from '@/modules/projects/labels'
import { getProject } from '@/modules/projects/queries'

export default async function ProjectOverviewPage({ params }: PageProps<'/projects/[id]'>) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const details: [string, React.ReactNode][] = [
    ['Site', project.site_address],
    ['Start date', project.start_date && formatDate(project.start_date)],
    ['Due date', project.due_date && formatDate(project.due_date)],
    ['Completed on', project.completed_date && formatDate(project.completed_date)],
    ['Description', project.description],
    ['Notes', project.notes],
  ]
  const estimates = ESTIMATE_FIELDS.map((f) => ({ label: f.label, amount: Number(project[f.column] ?? 0) }))
  const estimateTotal = estimates.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-x-6 gap-y-3 rounded border border-line bg-surface p-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-muted">Contract value</dt>
          <dd>{project.contract_value === null ? 'Not set' : formatINR(project.contract_value)}</dd>
        </div>
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
        <h2 className="text-lg font-semibold">Estimated cost</h2>
        <table className="w-full max-w-md text-sm">
          <tbody>
            {estimates.map((e) => (
              <tr key={e.label} className="border-b border-line">
                <td className="py-2">{e.label}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(e.amount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{formatINR(estimateTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
