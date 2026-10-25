import { notFound } from 'next/navigation'
import { listActiveCustomerOptions } from '@/modules/customers/queries'
import { ProjectForm } from '@/modules/projects/components/project-form'
import { getProject } from '@/modules/projects/queries'

const text = (value: string | number | null) => (value === null ? '' : String(value))

export default async function EditProjectPage({ params }: PageProps<'/projects/[id]/edit'>) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const customers = (await listActiveCustomerOptions()).map((c) => ({ id: c.id, label: c.name }))
  if (!customers.some((c) => c.id === project.customer_id)) {
    // The project keeps its customer even after they were switched off.
    customers.unshift({ id: project.customer_id, label: `${project.customer_name} (switched off)` })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Edit project</h2>
      <ProjectForm
        projectId={project.id}
        customers={customers}
        initial={{
          customerId: project.customer_id,
          title: project.title,
          siteAddress: text(project.site_address),
          description: text(project.description),
          status: project.status,
          startDate: text(project.start_date),
          dueDate: text(project.due_date),
          completedDate: text(project.completed_date),
          contractValue: text(project.contract_value),
          estMaterial: text(project.est_material),
          estLabour: text(project.est_labour),
          estPainting: text(project.est_painting),
          estTransport: text(project.est_transport),
          estOther: text(project.est_other),
          notes: text(project.notes),
        }}
      />
    </div>
  )
}
