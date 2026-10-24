import { MESSAGES } from './messages'

/** Rule messages raised by our database functions are written for people; anything else is not shown. */
export function dbMessage(error: { code?: string; message: string }): string {
  if (error.code === 'P0001' || error.code === '42501') return error.message
  console.error('database error', error)
  return MESSAGES.unexpected
}
