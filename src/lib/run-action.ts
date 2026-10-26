import { fail, type ActionResult } from './action-result'
import { MESSAGES } from './messages'

/**
 * Calls a server action from the browser. If the call itself fails (a dropped mobile connection, or a page opened
 * before a new version was deployed) the form gets the plain "Nothing was saved" message and keeps what was typed,
 * instead of the page being replaced by an error screen.
 */
export async function runAction<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call()
  } catch (error) {
    console.error('server action could not be completed', error)
    return fail(MESSAGES.unexpected)
  }
}
