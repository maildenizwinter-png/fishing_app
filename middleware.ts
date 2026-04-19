import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/register']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  const hasSession = request.cookies.getAll().some(
    cookie => cookie.name.includes('auth-token')
  )

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}