import type { ZodError } from 'zod'

export type ActionFailure = { ok: false; message: string; fieldErrors?: Record<string, string> }
export type ActionResult<T = null> = { ok: true; data: T } | ActionFailure

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionFailure {
  return fieldErrors ? { ok: false, message, fieldErrors } : { ok: false, message }
}

/** The first message for each field, keyed by its path ("gstin", or "invoice.prefix" for nested fields). */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !(key in errors)) errors[key] = issue.message
  }
  return errors
}
