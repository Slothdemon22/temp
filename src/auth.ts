/**
 * NextAuth Configuration for Readloom
 * 
 * This configuration sets up authentication using:
 * - Credentials provider (email + password)
 * - Prisma adapter for session management
 * - Extended session with user.id and user.points
 * 
 * Security features:
 * - Secure session cookies (httpOnly, sameSite)
 * - Password hashing via bcrypt
 * - Protection against timing attacks
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import type { User } from '@prisma/client'

/**
 * Extended session type to include user points
 * This is required because points are used throughout the app
 * for exchange eligibility checks
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      points: number
      isAdmin?: boolean
    }
  }

  interface User {
    id: string
    points: number
    isAdmin?: boolean
  }
}

/**
 * NextAuth configuration
 * 
 * Why Credentials provider:
 * - Simple email/password auth for hackathon MVP
 * - Easy to extend with OAuth later (just add more providers)
 * - Full control over authentication flow
 * 
 * Why Prisma adapter:
 * - Automatic session management
 * - Secure token storage
 * - Easy to query user data
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      /**
       * Authorize function - validates credentials
       * 
       * Security considerations:
       * - Always perform password check (even if user doesn't exist) to prevent timing attacks
       * - Use constant-time comparison via bcrypt
       * - Return generic error messages to prevent user enumeration
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          // Note: We check for deletedAt IS NULL to ensure soft-deleted users can't log in
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
              deletedAt: null, // Only allow active users
            },
          })

          // Always perform password verification to prevent timing attacks
          // Even if user doesn't exist, we hash a dummy password to maintain constant time
          if (!user) {
            // Hash a dummy password to prevent timing attacks
            // This ensures the response time is similar whether user exists or not
            await verifyPassword('dummy', '$2a$10$dummyhash')
            return null
          }

          // Verify password using constant-time comparison
          const isValidPassword = await verifyPassword(
            credentials.password as string,
            user.password
          )

          if (!isValidPassword) {
            return null
          }

          // Return user object that will be stored in session
          // Note: password is NOT included in the returned object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            points: user.points,
            isAdmin: user.isAdmin,
          }
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
      },
    }),
  ],

  /**
   * Session configuration
   * 
   * We extend the session to include:
   * - user.id: Required for database queries
   * - user.points: Required for exchange eligibility checks
   * 
   * Strategy: "jwt" is used because we're using Credentials provider
   * (database sessions are also available via Prisma adapter)
   */
  session: {
    strategy: 'jwt',
  },

  /**
   * Callbacks to customize session and JWT
   * 
   * These callbacks ensure user.id and user.points are available in the session
   */
  callbacks: {
    async jwt({ token, user, trigger }) {
      // When user first signs in, user object is available
      if (user) {
        token.id = user.id
        token.points = user.points
        token.isAdmin = user.isAdmin
        return token
      }
      
      // Only fetch fresh user data when explicitly triggered via session update
      // This prevents infinite loops and edge runtime errors
      // The token already has the data from sign-in, so we don't need to fetch on every request
      if (token.id && trigger === 'update') {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { points: true, isAdmin: true },
          })
          
          if (dbUser) {
            token.points = dbUser.points
            token.isAdmin = dbUser.isAdmin
          }
        } catch (error) {
          // Silently fail - use existing token data
          // Don't log errors as it creates noise and infinite loops
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Extend session with user.id, user.points, and user.isAdmin
      if (token.id && session.user) {
        session.user.id = token.id as string
        session.user.points = token.points as number
        session.user.isAdmin = token.isAdmin as boolean
      }
      
      return session
    },
  },

  /**
   * Pages configuration
   * Customize auth pages if needed in the future
   */
  pages: {
    signIn: '/login',
    signOut: '/',
  },

  /**
   * Security settings
   * 
   * These settings ensure secure session management:
   * - httpOnly cookies prevent XSS attacks
   * - sameSite prevents CSRF attacks
   * - secure cookies in production (HTTPS only)
   */
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
})

