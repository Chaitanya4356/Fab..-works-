import { formatINR } from '@/lib/format'

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
