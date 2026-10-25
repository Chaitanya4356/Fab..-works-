// Creates the first SteelFlow login on a new Supabase project. Run once per project:
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... FIRST_USER_EMAIL=... FIRST_USER_NAME="..." FIRST_USER_PASSWORD=... node scripts/create-first-user.mjs
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SECRET_KEY, FIRST_USER_EMAIL, FIRST_USER_NAME, FIRST_USER_PASSWORD } = process.env

const missing = Object.entries({ SUPABASE_URL, SUPABASE_SECRET_KEY, FIRST_USER_EMAIL, FIRST_USER_NAME, FIRST_USER_PASSWORD })
  .filter(([, value]) => !value)
  .map(([name]) => name)
if (missing.length) {
  console.error(`Set ${missing.join(', ')} before running this script.`)
  process.exit(1)
}
if (FIRST_USER_PASSWORD.length < 8) {
  console.error('FIRST_USER_PASSWORD must have at least 8 characters.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = FIRST_USER_EMAIL.trim().toLowerCase()
const { error } = await supabase.auth.admin.createUser({
  email,
  password: FIRST_USER_PASSWORD,
  email_confirm: true,
  app_metadata: { steelflow_staff: true },
  user_metadata: { full_name: FIRST_USER_NAME.trim() },
})
if (error) {
  console.error(`Could not create the login: ${error.message}`)
  process.exit(1)
}
console.log(`Created a login for ${FIRST_USER_NAME.trim()} (${email}).`)
