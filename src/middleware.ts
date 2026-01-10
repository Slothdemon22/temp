/**
 * Next.js Middleware for Route Protection
 * 
 * This middleware protects routes based on authentication status:
 * 
 * Protected routes (require authentication):
 * - /add-book - Adding books to the platform
 * - /exchange/* - Book exchange operations
 * - /profile - User profile page
 * - /points - Buy points page
 * 
 * Public routes (accessible without authentication):
 * - /books - Browse all books
 * - /book/[id] - View individual book by QR code
 * - /book-history/[bookId] - View book history (accessible via QR code)
 * - /forums - Forum discussions (supports anonymous participation)
 * - /login - Login page
 * - /signup - Signup page
 * 
 * Security considerations:
 * - Uses NextAuth's auth() function to check session
 * - Redirects unauthenticated users to login
 * - Preserves intended destination for redirect after login
 */

import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Define protected routes
  // These routes require authentication
  const protectedRoutes = [
    '/add-book',
    '/exchange',
    '/profile',
    '/points',
  ]

  // Define public routes that should be accessible without auth
  // These routes are explicitly public
  const publicRoutes = [
    '/',
    '/books',
    '/book',
    '/book-history',
    '/forums',
    '/login',
    '/signup',
  ]

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // If accessing a protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login with return URL
    // This allows users to return to their intended destination after login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Allow all other requests to proceed
  // This includes:
  // - Public routes (accessible to everyone)
  // - Protected routes accessed by authenticated users
  // - API routes (handled separately)
  return NextResponse.next()
})

// Configure which routes the middleware runs on
// This improves performance by not running middleware on unnecessary routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

