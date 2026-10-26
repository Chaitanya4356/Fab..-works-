'use client'

/** Last line of defence for anything that fails while a page loads. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">This page could not be shown</h1>
      <p className="text-muted">Something went wrong while loading it. Check the internet connection and try again.</p>
      <button type="button" className="button-primary" onClick={reset}>
        Try again
      </button>
    </section>
  )
}
