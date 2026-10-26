import 'server-only'
import { requireActiveUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import type { Trade, WorkerOption } from './labels'

export type TeamPlace = {
  id: string
  workerId: string
  workerName: string
  trade: Trade | null
  workerPhone: string | null
  workerIsActive: boolean
  role: string | null
  fromDate: string | null
  toDate: string | null
  isCurrent: boolean
}

export type WorkerProject = {
  id: string
  projectId: string
  projectNo: string
  projectTitle: string
  projectStatus: string
  role: string | null
  fromDate: string | null
  toDate: string | null
  isCurrent: boolean
}

// View columns are typed nullable but are always set for a real team place.
type PlaceRow = Database['public']['Views']['project_team_v']['Row']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLOSED_PROJECT = ['completed', 'cancelled']

const byLastDayNewest = (a: { toDate: string | null }, b: { toDate: string | null }) => (b.toDate ?? '').localeCompare(a.toDate ?? '')

/** A project's team: current places by name, then earlier places, most recently ended first. */
export async function listProjectTeam(projectId: string): Promise<TeamPlace[]> {
  await requireActiveUser()
  if (!UUID.test(projectId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from('project_team_v').select('*').eq('project_id', projectId)
  if (error) throw error
  const places = data.map((p: PlaceRow) => ({
    id: p.id!,
    workerId: p.worker_id!,
    workerName: p.worker_name!,
    trade: p.trade as Trade | null,
    workerPhone: p.worker_phone,
    workerIsActive: p.worker_status === 'active',
    role: p.role,
    fromDate: p.from_date,
    toDate: p.to_date,
    isCurrent: p.is_current!,
  }))
  const current = places.filter((p) => p.isCurrent).sort((a, b) => a.workerName.localeCompare(b.workerName))
  const earlier = places.filter((p) => !p.isCurrent).sort(byLastDayNewest)
  return [...current, ...earlier]
}

export async function countCurrentTeam(projectId: string): Promise<number> {
  await requireActiveUser()
  if (!UUID.test(projectId)) return 0
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('project_team_v')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_current', true)
  if (error) throw error
  return count ?? 0
}

/** Active workers who can join this project's team, each with their other current, still-open projects. */
export async function listWorkerOptions(projectId: string): Promise<WorkerOption[]> {
  await requireActiveUser()
  if (!UUID.test(projectId)) return []
  const supabase = await createClient()
  const [workers, places] = await Promise.all([
    supabase.from('workers').select('id, full_name, trade').eq('status', 'active').order('full_name'),
    supabase.from('project_team_v').select('worker_id, project_id, project_no, project_status').eq('is_current', true),
  ])
  if (workers.error) throw workers.error
  if (places.error) throw places.error

  const onThisProject = new Set(places.data.filter((p) => p.project_id === projectId).map((p) => p.worker_id))
  return workers.data
    .filter((w) => !onThisProject.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.full_name,
      trade: w.trade as Trade | null,
      otherProjects: places.data
        .filter((p) => p.worker_id === w.id && !CLOSED_PROJECT.includes(p.project_status!))
        .map((p) => p.project_no!)
        .sort(),
    }))
}

/** The projects a worker is or was on: current places first, then earlier ones, most recently ended first. */
export async function listWorkerProjects(workerId: string): Promise<WorkerProject[]> {
  await requireActiveUser()
  if (!UUID.test(workerId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from('project_team_v').select('*').eq('worker_id', workerId)
  if (error) throw error
  const places = data.map((p: PlaceRow) => ({
    id: p.id!,
    projectId: p.project_id!,
    projectNo: p.project_no!,
    projectTitle: p.project_title!,
    projectStatus: p.project_status!,
    role: p.role,
    fromDate: p.from_date,
    toDate: p.to_date,
    isCurrent: p.is_current!,
  }))
  const current = places.filter((p) => p.isCurrent).sort((a, b) => a.projectNo.localeCompare(b.projectNo))
  const earlier = places.filter((p) => !p.isCurrent).sort(byLastDayNewest)
  return [...current, ...earlier]
}
