import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireActiveUser } from '@/lib/auth'
import { countAttachments } from '@/modules/files/queries'
import { ProjectTabs } from '@/modules/projects/components/project-tabs'
import { OverduePill, StatusPill } from '@/modules/projects/components/status-pill'
import { getProject } from '@/modules/projects/queries'

export default async function ProjectLayout({ children, params }: LayoutProps<'/projects/[id]'>) {
  await requireActiveUser()
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  const fileCount = await countAttachments('project', project.id)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-muted">{project.project_no}</p>
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/customers/${project.customer_id}`} className="underline underline-offset-4">
            {project.customer_name}
          </Link>
          <StatusPill status={project.status} />
          {project.is_overdue && <OverduePill />}
        </div>
        <div>
          <Link href={`/projects/${project.id}/edit`} className="button-secondary">
            Edit
          </Link>
        </div>
      </div>
      <ProjectTabs
        tabs={[
          { href: `/projects/${project.id}`, label: 'Overview' },
          { href: `/projects/${project.id}/files`, label: fileCount ? `Files (${fileCount})` : 'Files' },
        ]}
      />
      {children}
    </section>
  )
}
