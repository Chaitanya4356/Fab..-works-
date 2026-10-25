import { requireActiveUser } from '@/lib/auth'
import { todayIST } from '@/lib/dates'
import { DocNumberFormats } from '@/modules/settings/components/doc-number-formats'
import { LogoField } from '@/modules/settings/components/logo-field'
import { SettingsForm, type SettingsFormValues } from '@/modules/settings/components/settings-form'
import { StorageUsage } from '@/modules/settings/components/storage-usage'
import { getDocNumberFormats, getLogoUrl, getSettings, getStorageUsage } from '@/modules/settings/queries'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-surface p-4 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default async function SettingsPage() {
  await requireActiveUser()
  const today = todayIST()
  const [settings, usage, formats] = await Promise.all([getSettings(), getStorageUsage(), getDocNumberFormats(today)])
  const logoUrl = await getLogoUrl(settings.logo_path)

  const initial: SettingsFormValues = {
    workshopName: settings.workshop_name,
    address: settings.address ?? '',
    city: settings.city ?? '',
    state: settings.state ?? '',
    pincode: settings.pincode ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    bankName: settings.bank_name ?? '',
    bankAccountName: settings.bank_account_name ?? '',
    bankAccountNo: settings.bank_account_no ?? '',
    bankIfsc: settings.bank_ifsc ?? '',
    upiId: settings.upi_id ?? '',
    gstEnabled: settings.gst_enabled,
    gstin: settings.gstin ?? '',
    defaultGstRate: String(settings.default_gst_rate),
    defaultMarginPercent: String(settings.default_margin_percent),
    quotationValidityDays: String(settings.quotation_validity_days),
    invoiceDueDays: String(settings.invoice_due_days),
    quotationTerms: settings.quotation_terms ?? '',
    invoiceTerms: settings.invoice_terms ?? '',
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Section title="Workshop details">
        <SettingsForm initial={initial} />
      </Section>
      <Section title="Logo">
        <LogoField initialUrl={logoUrl} />
      </Section>
      <Section title="Document numbers">
        <DocNumberFormats initial={formats} today={today} gstEnabled={settings.gst_enabled} />
      </Section>
      <Section title="Storage">
        <StorageUsage filesBytes={usage.filesBytes} databaseBytes={usage.databaseBytes} />
      </Section>
    </div>
  )
}
