import { requireActiveUser } from '@/lib/auth'
import { WorkerForm } from '@/modules/workers/components/worker-form'
import { EMPTY_WORKER } from '@/modules/workers/form-values'

export default async function NewWorkerPage() {
  await requireActiveUser()
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New worker</h1>
      <WorkerForm initial={EMPTY_WORKER} />
    </section>
  )
}
