import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getCustomer } from '@/modules/customers/queries'
import { getSettings } from '@/modules/settings/queries'
import { pdfFileName } from './labels'
import { renderQuotationPdf, type PdfLogo } from './pdf-document'
import { quotationPdfModel } from './pdf-model'
import { getQuotation } from './queries'

/** The workshop logo, when it is a format the PDF can draw (PNG or JPEG). */
async function loadLogo(path: string | null): Promise<PdfLogo | null> {
  if (!path) return null
  const format = /\.png$/i.test(path) ? 'png' : /\.jpe?g$/i.test(path) ? 'jpg' : null
  if (!format) return null
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('files').download(path)
  if (error || !data) return null
  return { data: Buffer.from(await data.arrayBuffer()), format }
}

/** A quotation as a PDF, or null when there is no such quotation. Only customer-facing data goes in. */
export async function buildQuotationPdf(id: string): Promise<{ buffer: Buffer; fileName: string; label: string } | null> {
  const quotation = await getQuotation(id)
  if (!quotation) return null
  const [customer, settings] = await Promise.all([getCustomer(quotation.customer_id), getSettings()])
  if (!customer) return null

  const model = quotationPdfModel({
    quoteNo: quotation.quote_no,
    revision: quotation.revision,
    quoteDate: quotation.quote_date,
    validUntil: quotation.valid_until,
    title: quotation.title,
    siteAddress: quotation.site_address,
    scope: quotation.scope,
    terms: quotation.terms,
    gstRate: quotation.gst_rate,
    subtotal: quotation.subtotal,
    gstAmount: quotation.gst_amount,
    roundOff: quotation.round_off,
    grandTotal: quotation.grand_total,
    customer: {
      name: customer.name,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      phone: customer.phone,
      gstin: customer.gstin,
    },
    items: quotation.items.map((i) => ({
      description: i.description,
      hsnSac: i.hsnSac,
      qty: i.qty,
      unit: i.unit,
      rate: i.rate,
      amount: i.amount,
    })),
    workshop: {
      name: settings.workshop_name,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      phone: settings.phone,
      email: settings.email,
      gstEnabled: settings.gst_enabled,
      gstin: settings.gstin,
    },
  })
  const buffer = await renderQuotationPdf(model, await loadLogo(settings.logo_path))
  return { buffer, fileName: pdfFileName(model.number), label: model.number }
}
