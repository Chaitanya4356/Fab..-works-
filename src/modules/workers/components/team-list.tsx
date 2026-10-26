'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { TRADE_LABELS, teamDates } from '../labels'
import { endTeamPlace } from '../team-actions'
import type { TeamPlace } from '../team-queries'

function PlaceSummary({ place }: { place: TeamPlace }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link href={`/workers/${place.workerId}`} className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline">
        {place.workerName}
      </Link>
      {place.trade && <span className="text-sm text-muted">{TRADE_LABELS[place.trade]}</span>}
      {place.role && <span className="text-sm">{place.role}</span>}
      <span className="text-sm text-muted">{teamDates(place.fromDate, place.toDate)}</span>
      {!place.workerIsActive && <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">Switched off</span>}
    </div>
  )
}

function CurrentPlace({ place, today }: { place: TeamPlace; today: string }) {
  const [takingOff, setTakingOff] = useState(false)
  const [lastDay, setLastDay] = useState(today)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const confirm = () =>
    startTransition(async () => {
      const result = await runAction(() => endTeamPlace(place.id, { lastDay }))
      if (!result.ok) setMessage(result.fieldErrors?.lastDay ?? result.message)
    })

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <PlaceSummary place={place} />
      {takingOff ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Last day
            <input type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} aria-invalid={Boolean(message)} className="field" />
          </label>
          <button type="button" disabled={pending} className="button-primary" onClick={confirm}>
            Confirm
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setTakingOff(false)
              setMessage(null)
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <button type="button" className="button-secondary" onClick={() => setTakingOff(true)}>
            Take off team
          </button>
        </div>
      )}
      {message && <p className="text-sm text-oxide">{message}</p>}
    </li>
  )
}

/** The people on a project now, and those who were on it earlier. */
export function TeamList({ places, today }: { places: TeamPlace[]; today: string }) {
  const current = places.filter((p) => p.isCurrent)
  const earlier = places.filter((p) => !p.isCurrent)
  const listClass = 'flex flex-col divide-y divide-line rounded border border-line bg-surface'

  return (
    <div className="flex flex-col gap-4">
      {current.length === 0 ? (
        <p className="text-muted">No one on the team yet.</p>
      ) : (
        <ul aria-label="Current team" className={listClass}>
          {current.map((p) => (
            <CurrentPlace key={p.id} place={p} today={today} />
          ))}
        </ul>
      )}
      {earlier.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Earlier on this project</h3>
          <ul aria-label="Earlier on this project" className={listClass}>
            {earlier.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <PlaceSummary place={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
