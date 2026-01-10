/**
 * Admin Authorization Helpers
 * 
 * Provides utilities for checking admin status and requiring admin access.
 * 
 * HARDCODED ADMIN CREDENTIALS (for hackathon):
 * - Email: admin@booksexchange.com
 * - Password: admin123
 * 
 * Security Note:
 * - In production, admin status should be checked from database
 * - For hackathon, we use hardcoded email check for simplicity
 */

import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Hardcoded admin email (for hackathon demo)
const ADMIN_EMAIL = 'admin@booksexchange.com'

/**
 * Check if current user is admin
 * 
 * Checks both session isAdmin field and database to ensure admin status.
 * 
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await requireAuth()
    
    // First check session isAdmin field (fast check)
    if (user.isAdmin) {
      // Verify in database to ensure admin status is still valid
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isAdmin: true },
      })
      
      return dbUser?.isAdmin === true
    }
    
    // Fallback: Check hardcoded admin email (for backward compatibility)
    if (user.email === ADMIN_EMAIL) {
      const dbUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
        select: { isAdmin: true },
      })
      
      return dbUser?.isAdmin === true
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Require admin access - throws error if user is not admin
 * 
 * Use this in server actions or API routes that require admin privileges
 * 
 * @returns User object (guaranteed to be admin)
 * @throws Error if user is not admin
 */
export async function requireAdmin() {
  const user = await requireAuth()
  
  // Check if user is admin
  const adminStatus = await isAdmin()
  
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required')
  }
  
  return user
}

/**
 * Get admin user from database
 * 
 * @returns Admin user or null if not found
 */
export async function getAdminUser() {
  return prisma.user.findFirst({
    where: {
      email: ADMIN_EMAIL,
      isAdmin: true,
    },
  })
}

