import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Clears the login cookies, then shows the login screen. Pages cannot clear cookies, so they send people here. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })

  const url = request.nextUrl.clone()
  const reason = url.searchParams.get('reason')
  url.pathname = '/login'
  url.search = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  return NextResponse.redirect(url)
}
