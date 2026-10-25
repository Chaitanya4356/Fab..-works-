import { notFound } from 'next/navigation'
import { AttachmentList } from '@/modules/files/components/attachment-list'
import { listAttachments } from '@/modules/files/queries'
import { getProject } from '@/modules/projects/queries'

export default async function ProjectFilesPage({ params }: PageProps<'/projects/[id]/files'>) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  const items = await listAttachments('project', project.id)
  return <AttachmentList entityType="project" entityId={project.id} items={items} />
}
