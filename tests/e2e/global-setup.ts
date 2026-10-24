import { OWNER, createTestUser } from './fixtures'

export default async function globalSetup() {
  await createTestUser(OWNER)
}
