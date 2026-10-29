import { NextRequest, NextResponse } from 'next/server'

const MANAGEMENT_ROLES = new Set(['admin', 'administrator', 'manager'])

function getApiBaseUrl() {
  const configuredBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000'
  const base = configuredBase.replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
}

function normalizeRole(role: unknown) {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export async function middleware(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  const token =
    request.cookies.get('access_token')?.value ||
    request.cookies.get('token')?.value

  if (!token) return NextResponse.redirect(loginUrl)

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return NextResponse.redirect(loginUrl)

    const currentUser: unknown = await response.json()
    if (
      typeof currentUser !== 'object' ||
      currentUser === null ||
      !('role' in currentUser) ||
      !MANAGEMENT_ROLES.has(normalizeRole(currentUser.role))
    ) {
      return NextResponse.redirect(new URL('/?forbidden=1', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ['/users/:path*', '/accounts/:path*'],
}
