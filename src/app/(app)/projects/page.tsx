import { Placeholder } from '@/components/placeholder'
import { requireActiveUser } from '@/lib/auth'

export default async function ProjectsPage() {
  await requireActiveUser()
  return <Placeholder title="Projects" />
}
