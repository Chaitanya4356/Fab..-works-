import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

const PUBLIC_PATHS = ['/login', '/auth/signout']

/** Refreshes the login session on every request and keeps visitors without one on the login screen. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const hasSession = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname

  if (!hasSession && !PUBLIC_PATHS.includes(path)) {
    return redirectKeepingCookies(request, '/login', response)
  }
  if (hasSession && path === '/login') {
    return redirectKeepingCookies(request, '/', response)
  }
  return response
}

function redirectKeepingCookies(request: NextRequest, pathname: string, from: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
