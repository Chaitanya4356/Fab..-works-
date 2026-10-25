import Link from 'next/link'
import { requireActiveUser } from '@/lib/auth'
import { listActiveCustomerOptions } from '@/modules/customers/queries'
import { ProjectForm } from '@/modules/projects/components/project-form'
import { EMPTY_PROJECT } from '@/modules/projects/form-values'

export default async function NewProjectPage({ searchParams }: PageProps<'/projects/new'>) {
  await requireActiveUser()
  const { customer } = await searchParams
  const customers = await listActiveCustomerOptions()
  const preselected = customers.find((c) => c.id === customer)?.id ?? ''

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New project</h1>
      {customers.length === 0 ? (
        <p className="text-muted">
          Add a customer first.{' '}
          <Link href="/customers/new?then=project" className="underline underline-offset-4">
            New customer
          </Link>
        </p>
      ) : (
        <ProjectForm
          initial={{ ...EMPTY_PROJECT, customerId: preselected }}
          customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        />
      )}
    </section>
  )
}
