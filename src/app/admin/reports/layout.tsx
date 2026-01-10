/**
 * Admin Reports Layout
 * 
 * Server-side authorization check to ensure only admins can access this page.
 */

import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-helpers'

export default async function AdminReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is admin
  const adminStatus = await isAdmin()

  if (!adminStatus) {
    // Redirect non-admin users
    redirect('/exchanges')
  }

  return <>{children}</>
}

