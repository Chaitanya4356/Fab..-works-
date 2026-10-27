import { activeUserForAction } from '@/lib/auth'
import { buildQuotationPdf } from '@/modules/quotations/pdf'

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** PDFs for logged-in users (spec 4.6). Quotations for now; invoices and delivery notes join in later stages. */
export async function GET(_request: Request, ctx: RouteContext<'/api/pdf/[doc]/[id]'>) {
  const auth = await activeUserForAction()
  if (!auth.ok) return new Response(auth.message, { status: 401 })
  const { doc, id } = await ctx.params
  if (doc !== 'quotation' || !GUID.test(id)) return new Response('Not found', { status: 404 })

  const pdf = await buildQuotationPdf(id)
  if (!pdf) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdf.fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
