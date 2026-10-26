import { notFound } from 'next/navigation'
import { WorkerForm } from '@/modules/workers/components/worker-form'
import { workerFormValues } from '@/modules/workers/form-values'
import { getWorker } from '@/modules/workers/queries'

export default async function EditWorkerPage({ params }: PageProps<'/workers/[id]/edit'>) {
  const { id } = await params
  const worker = await getWorker(id)
  if (!worker) notFound()

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit {worker.full_name}</h1>
      <WorkerForm workerId={worker.id} initial={workerFormValues(worker)} />
    </section>
  )
}
