import { requireActiveUser } from '@/lib/auth'
import { todayIST } from '@/lib/dates'
import { getCustomer, listActiveCustomerOptions } from '@/modules/customers/queries'
import { QuotationEditor } from '@/modules/quotations/components/quotation-editor'
import { newQuotationValues } from '@/modules/quotations/form-values'
import { getSettings } from '@/modules/settings/queries'

export default async function NewQuotationPage({ searchParams }: PageProps<'/quotes/new'>) {
  await requireActiveUser()
  const { customer: customerParam } = await searchParams
  const [settings, customers] = await Promise.all([getSettings(), listActiveCustomerOptions()])
  const chosen =
    typeof customerParam === 'string' && customers.some((c) => c.id === customerParam) ? await getCustomer(customerParam) : null

  const initial = newQuotationValues({
    today: todayIST(),
    validityDays: settings.quotation_validity_days,
    margin: settings.default_margin_percent,
    terms: settings.quotation_terms,
    customer: chosen ? { id: chosen.id, address: chosen.address } : undefined,
  })

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New quotation</h1>
      <QuotationEditor
        initial={initial}
        customers={customers}
        gstRate={settings.gst_enabled ? String(settings.default_gst_rate) : null}
      />
    </section>
  )
}
