import { notFound } from 'next/navigation'
import { todayIST } from '@/lib/dates'
import { getProject } from '@/modules/projects/queries'
import { AddToTeamForm } from '@/modules/workers/components/add-to-team-form'
import { TeamList } from '@/modules/workers/components/team-list'
import { listProjectTeam, listWorkerOptions } from '@/modules/workers/team-queries'

export default async function ProjectTeamPage({ params }: PageProps<'/projects/[id]/team'>) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  const [places, options] = await Promise.all([listProjectTeam(project.id), listWorkerOptions(project.id)])
  const today = todayIST()

  return (
    <div className="flex flex-col gap-6">
      <TeamList places={places} today={today} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add someone to the team</h2>
        <AddToTeamForm projectId={project.id} options={options} today={today} />
      </section>
    </div>
  )
}
