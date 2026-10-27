import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import type { QuotationPdfModel } from './pdf-model'

export type PdfLogo = { data: Buffer; format: 'png' | 'jpg' }

const INK = '#1f2328'
const MUTED = '#5c6470'
const LINE = '#d0d4da'

const styles = StyleSheet.create({
  page: { fontFamily: 'Noto Sans', fontSize: 9.5, color: INK, padding: 36, lineHeight: 1.35 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  logo: { width: 64, height: 64, objectFit: 'contain' },
  workshopName: { fontSize: 15, fontWeight: 700 },
  muted: { color: MUTED },
  title: { fontSize: 13, fontWeight: 700, letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  parties: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 10 },
  label: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  bold: { fontWeight: 700 },
  meta: { alignItems: 'flex-end' },
  block: { marginBottom: 8 },
  table: { marginTop: 6, borderTopWidth: 1, borderColor: LINE },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: LINE, paddingVertical: 4 },
  headRow: { backgroundColor: '#f2f3f5', fontWeight: 700 },
  cNo: { width: '5%' },
  cDesc: { width: '39%', paddingRight: 6 },
  cHsn: { width: '10%' },
  cQty: { width: '9%', textAlign: 'right' },
  cUnit: { width: '9%', paddingLeft: 4 },
  cRate: { width: '13%', textAlign: 'right' },
  cAmount: { width: '15%', textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: '45%', marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandRow: { borderTopWidth: 1, borderColor: INK, marginTop: 2, paddingTop: 4, fontWeight: 700, fontSize: 11 },
  words: { marginTop: 10, fontWeight: 700 },
  terms: { marginTop: 14 },
  signature: { marginTop: 36, alignSelf: 'flex-end', alignItems: 'center' },
})

/** The quotation as the customer receives it: items and totals only, never the cost sheet (spec 7.1). */
export function QuotationPdf({ model, logo }: { model: QuotationPdfModel; logo: PdfLogo | null }) {
  return (
    <Document title={`Quotation ${model.number}`} author={model.workshop.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt text */}
          {logo && <Image src={logo} style={styles.logo} />}
          <View>
            <Text style={styles.workshopName}>{model.workshop.name}</Text>
            {model.workshop.lines.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.title}>QUOTATION</Text>

        <View style={styles.parties}>
          <View>
            <Text style={styles.label}>To</Text>
            <Text style={styles.bold}>{model.customer.name}</Text>
            {model.customer.lines.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
          </View>
          <View style={styles.meta}>
            <Text>
              <Text style={styles.bold}>Quotation No. </Text>
              {model.number}
            </Text>
            <Text>
              <Text style={styles.bold}>Date </Text>
              {model.date}
            </Text>
            {model.validUntil && (
              <Text>
                <Text style={styles.bold}>Valid until </Text>
                {model.validUntil}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.block}>
          <Text>
            <Text style={styles.bold}>Subject: </Text>
            {model.subject}
          </Text>
          {model.site && (
            <Text>
              <Text style={styles.bold}>Site: </Text>
              {model.site}
            </Text>
          )}
        </View>
        {model.scope && (
          <View style={styles.block}>
            <Text style={styles.label}>Scope of work</Text>
            <Text>{model.scope}</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]} fixed>
            <Text style={styles.cNo}>#</Text>
            <Text style={styles.cDesc}>Description</Text>
            <Text style={styles.cHsn}>HSN/SAC</Text>
            <Text style={styles.cQty}>Qty</Text>
            <Text style={styles.cUnit}>Unit</Text>
            <Text style={styles.cRate}>Rate</Text>
            <Text style={styles.cAmount}>Amount</Text>
          </View>
          {model.items.map((item) => (
            <View key={item.no} style={styles.row} wrap={false}>
              <Text style={styles.cNo}>{item.no}</Text>
              <Text style={styles.cDesc}>{item.description}</Text>
              <Text style={styles.cHsn}>{item.hsnSac}</Text>
              <Text style={styles.cQty}>{item.qty}</Text>
              <Text style={styles.cUnit}>{item.unit}</Text>
              <Text style={styles.cRate}>{item.rate}</Text>
              <Text style={styles.cAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          {model.totals.map((t, i) => (
            <View key={t.label} style={i === model.totals.length - 1 ? [styles.totalRow, styles.grandRow] : styles.totalRow}>
              <Text>{t.label}</Text>
              <Text>{t.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.words}>{model.amountInWords}</Text>

        {model.terms.length > 0 && (
          <View style={styles.terms}>
            {/* Terms may be long: they run onto the next page rather than being cut off. */}
            <Text style={styles.label} minPresenceAhead={40}>
              Terms
            </Text>
            {model.terms.map((term) => (
              <Text key={term}>{term}</Text>
            ))}
          </View>
        )}

        <View style={styles.signature} wrap={false}>
          <Text style={styles.bold}>{model.signature}</Text>
          <Text style={[styles.muted, { marginTop: 28 }]}>Authorised signatory</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderQuotationPdf(model: QuotationPdfModel, logo: PdfLogo | null): Promise<Buffer> {
  registerPdfFonts()
  return renderToBuffer(<QuotationPdf model={model} logo={logo} />)
}
