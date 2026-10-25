export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** A GSTIN starts with its state's GST code; returns a message when it doesn't match the chosen state. */
export function gstinStateMessage(gstin: string | null, stateCode: string | null): string | null {
  if (!gstin || !stateCode || gstin.slice(0, 2) === stateCode) return null
  return `This GSTIN is for a different state (code ${gstin.slice(0, 2)}). Check the state or the GSTIN.`
}
