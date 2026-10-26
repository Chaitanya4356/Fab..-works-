import { notFound, redirect } from 'next/navigation'
import { listActiveCustomerOptions } from '@/modules/customers/queries'
import { QuotationEditor } from '@/modules/quotations/components/quotation-editor'
import { quotationFormValues } from '@/modules/quotations/form-values'
import { getQuotation } from '@/modules/quotations/queries'
import { getSettings } from '@/modules/settings/queries'

export default async function EditQuotationPage({ params }: PageProps<'/quotes/[id]/edit'>) {
  const { id } = await params
  const quotation = await getQuotation(id)
  if (!quotation) notFound()
  if (quotation.status !== 'draft') redirect(`/quotes/${quotation.id}`)
  const [settings, active] = await Promise.all([getSettings(), listActiveCustomerOptions()])
  // A draft keeps its customer even if they were switched off since.
  const customers = active.some((c) => c.id === quotation.customer.id)
    ? active
    : [...active, { id: quotation.customer.id, name: quotation.customer.name }]

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit {quotation.label}</h1>
      <QuotationEditor
        quotationId={quotation.id}
        initial={quotationFormValues(quotation)}
        customers={customers}
        gstRate={settings.gst_enabled ? String(settings.default_gst_rate) : null}
      />
    </section>
  )
}
