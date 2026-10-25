import { notFound } from 'next/navigation'
import { CustomerForm } from '@/modules/customers/components/customer-form'
import { getCustomer } from '@/modules/customers/queries'

export default async function EditCustomerPage({ params }: PageProps<'/customers/[id]/edit'>) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit {customer.name}</h1>
      <CustomerForm
        customerId={customer.id}
        initial={{
          name: customer.name,
          contactPerson: customer.contact_person ?? '',
          phone: customer.phone ?? '',
          altPhone: customer.alt_phone ?? '',
          email: customer.email ?? '',
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          pincode: customer.pincode ?? '',
          gstin: customer.gstin ?? '',
          notes: customer.notes ?? '',
        }}
      />
    </section>
  )
}
