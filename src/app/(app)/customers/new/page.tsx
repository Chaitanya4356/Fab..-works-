import { requireActiveUser } from '@/lib/auth'
import { CustomerForm } from '@/modules/customers/components/customer-form'
import { EMPTY_CUSTOMER } from '@/modules/customers/form-values'

export default async function NewCustomerPage({ searchParams }: PageProps<'/customers/new'>) {
  await requireActiveUser()
  const { then } = await searchParams
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New customer</h1>
      <CustomerForm initial={EMPTY_CUSTOMER} then={then === 'project' ? 'project' : undefined} />
    </section>
  )
}
