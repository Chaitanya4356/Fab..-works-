import { formatINR } from '@/lib/format'
import { paiseToRupees } from '@/lib/money'
import type { QuotationTotals } from '../maths'

const rupees = (paise: bigint) => formatINR(paiseToRupees(paise))

/** A quotation's totals. With showCost it also shows the cost and the profit, which never reach the customer. */
export function TotalsBlock({ totals, gstRate, showCost }: { totals: QuotationTotals; gstRate: string | null; showCost: boolean }) {
  const rows: [string, string][] = showCost
    ? [
        ['Cost', rupees(totals.costTotal)],
        ['Price before GST', rupees(totals.subtotal)],
        ['Profit', `${rupees(totals.profit)} (${totals.profitPercent}% of price)`],
      ]
    : [['Subtotal', rupees(totals.subtotal)]]
  if (gstRate !== null) rows.push([`GST @ ${Number(gstRate)}%`, rupees(totals.gstAmount)])
  if (totals.roundOff !== 0n) rows.push(['Round off', rupees(totals.roundOff)])
  rows.push(['Grand total', rupees(totals.grandTotal)])

  return (
    <section aria-label="Totals" className="flex w-full max-w-md flex-col gap-1 self-end rounded border border-line bg-surface p-4 text-sm">
      {rows.map(([label, value], i) => (
        <p key={label} className={`flex justify-between gap-4 ${i === rows.length - 1 ? 'border-t border-line pt-2 font-semibold' : ''}`}>
          <span>{label}</span> <span className="tabular-nums">{value}</span>
        </p>
      ))}
    </section>
  )
}
