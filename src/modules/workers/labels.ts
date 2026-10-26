import { formatDate, formatINR } from '@/lib/format'

export const TRADES = ['fitter', 'welder', 'fabricator', 'painter', 'helper', 'supervisor', 'other'] as const
export type Trade = (typeof TRADES)[number]

export const TRADE_LABELS: Record<Trade, string> = {
  fitter: 'Fitter',
  welder: 'Welder',
  fabricator: 'Fabricator',
  painter: 'Painter',
  helper: 'Helper',
  supervisor: 'Supervisor',
  other: 'Other',
}

export const PAY_TYPES = ['daily', 'hourly', 'monthly'] as const
export type PayType = (typeof PAY_TYPES)[number]

export const PAY_TYPE_LABELS: Record<PayType, string> = { daily: 'Daily', hourly: 'Hourly', monthly: 'Monthly' }

const PERIOD: Record<PayType, string> = { daily: 'day', hourly: 'hour', monthly: 'month' }

/** A wage with its period, e.g. ₹650.00 per day; null when no wage is recorded. */
export function wageText(payType: PayType | null, payRate: number | string | null): string | null {
  if (!payType || payRate === null) return null
  return `${formatINR(payRate)} per ${PERIOD[payType]}`
}

/** An active worker who can join a project team, with the numbers of their other current projects. */
export type WorkerOption = { id: string; name: string; trade: Trade | null; otherProjects: string[] }

/** How a worker appears in the team picker, e.g. "Ramesh Kumar · Welder · also on PRJ/2026-27/0003". */
export function workerOptionLabel(o: WorkerOption): string {
  return [o.name, o.trade && TRADE_LABELS[o.trade], o.otherProjects.length > 0 && `also on ${o.otherProjects.join(', ')}`]
    .filter(Boolean)
    .join(' · ')
}

/** When a worker was on a team: "Since 01-11-2026" while current, "01-11-2026 to 05-11-2026" once taken off. */
export function teamDates(fromDate: string | null, toDate: string | null): string {
  if (toDate === null) return fromDate ? `Since ${formatDate(fromDate)}` : 'Current'
  return fromDate ? `${formatDate(fromDate)} to ${formatDate(toDate)}` : `Until ${formatDate(toDate)}`
}
