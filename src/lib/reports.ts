/**
 * Report Management Utilities
 * 
 * Handles the complete report lifecycle:
 * - Create reports for exchanged books
 * - Validate report eligibility
 * - Enforce access control
 * - Anti-abuse safeguards
 * - Integration with exchange dispute system
 * 
 * CRITICAL DESIGN DECISIONS:
 * 
 * 1. Report Eligibility:
 *    - Only authenticated users can report
 *    - Only users involved in the exchange can report
 *    - Only COMPLETED exchanges can be reported
 *    - This ensures reports are legitimate and timely
 * 
 * 2. Exchange Status Update:
 *    - When a report is created, exchange status → DISPUTED
 *    - Points are frozen (not auto-refunded)
 *    - Ownership remains unchanged until resolution
 *    - Prevents further actions on disputed exchanges
 * 
 * 3. Anti-Abuse Safeguards:
 *    - Rate limiting: Max 3 reports per user per 24 hours
 *    - Duplicate prevention: Same exchange + reason cannot be reported twice
 *    - Description length validation: Max 1000 characters
 * 
 * 4. Access Control:
 *    - Only reporter and exchange participants can view reports
 *    - Reports cannot be modified after submission
 *    - Immutable audit trail for fairness
 * 
 * 5. Fairness Preservation:
 *    - Points frozen (not reverted) to prevent abuse
 *    - Both parties can see the report
 *    - Admin resolution required (can be mocked for hackathon)
 */

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'

// Rate limiting constants
const MAX_REPORTS_PER_DAY = 3
const RATE_LIMIT_WINDOW_HOURS = 24
const MAX_DESCRIPTION_LENGTH = 1000

/**
 * Report reason enum values
 * These match the Prisma enum ReportReason
 */
export type ReportReason =
  | 'CONDITION_MISMATCH'
  | 'DAMAGED_BOOK'
  | 'WRONG_BOOK'
  | 'MISSING_PAGES'
  | 'FAKE_LISTING'
  | 'OTHER'

/**
 * Report status enum values
 * These match the Prisma enum ReportStatus
 */
export type ReportStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'

/**
 * Check if user has exceeded rate limit for reports
 * 
 * Anti-abuse: Prevents users from spamming reports
 * 
 * @param userId - User ID to check
 * @returns true if user has exceeded rate limit
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date()
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS)

  const recentReports = await prisma.report.count({
    where: {
      reporterId: userId,
      createdAt: {
        gte: windowStart,
      },
    },
  })

  return recentReports >= MAX_REPORTS_PER_DAY
}

/**
 * Check if a duplicate report exists
 * 
 * Anti-abuse: Prevents same user from reporting same exchange + reason twice
 * 
 * @param exchangeId - Exchange ID
 * @param reporterId - Reporter user ID
 * @param reason - Report reason
 * @returns true if duplicate report exists
 */
async function checkDuplicateReport(
  exchangeId: string,
  reporterId: string,
  reason: ReportReason
): Promise<boolean> {
  const existingReport = await prisma.report.findUnique({
    where: {
      exchangeId_reporterId_reason: {
        exchangeId,
        reporterId,
        reason,
      },
    },
  })

  return !!existingReport
}

/**
 * Validate report description length
 * 
 * @param description - Optional description text
 * @throws Error if description exceeds max length
 */
function validateDescription(description?: string | null): void {
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
    )
  }
}

/**
 * Create a report for an exchanged book
 * 
 * Rules:
 * - Only authenticated users can report
 * - Only users involved in the exchange can report
 * - Only COMPLETED exchanges can be reported
 * - Rate limiting: Max 3 reports per user per 24 hours
 * - Duplicate prevention: Same exchange + reason cannot be reported twice
 * - Description length validation: Max 1000 characters
 * 
 * When a report is created:
 * - Exchange status is updated to DISPUTED
 * - Points are frozen (not auto-refunded)
 * - Ownership remains unchanged
 * 
 * @param exchangeId - Exchange UUID
 * @param reason - Report reason (enum)
 * @param description - Optional detailed description
 * @returns Created report
 */
export async function createReport(
  exchangeId: string,
  reason: ReportReason,
  description?: string | null
) {
  const reporter = await requireAuth()

  // Validate description length
  validateDescription(description)

  // Get exchange with book and user information
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    include: {
      book: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Validation: Only users involved in the exchange can report
  if (
    exchange.fromUserId !== reporter.id &&
    exchange.toUserId !== reporter.id
  ) {
    throw new Error(
      'Only users involved in the exchange can report issues'
    )
  }

  // Validation: Only COMPLETED exchanges can be reported
  if (exchange.status !== 'COMPLETED') {
    throw new Error(
      `Cannot report exchange with status: ${exchange.status}. Only completed exchanges can be reported.`
    )
  }

  // Anti-abuse: Check rate limit
  if (await checkRateLimit(reporter.id)) {
    throw new Error(
      `You have exceeded the maximum number of reports (${MAX_REPORTS_PER_DAY}) in the last ${RATE_LIMIT_WINDOW_HOURS} hours. Please try again later.`
    )
  }

  // Anti-abuse: Check for duplicate report
  if (await checkDuplicateReport(exchangeId, reporter.id, reason)) {
    throw new Error(
      'You have already reported this exchange with the same reason. Please use a different reason or wait for the current report to be resolved.'
    )
  }

  // ATOMIC OPERATION: Create report and update exchange status in a transaction
  // This ensures:
  // - Report is created atomically
  // - Exchange status is updated to DISPUTED atomically
  // - Points are frozen (exchange status = DISPUTED prevents further actions)
  // If any step fails, everything rolls back
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the report
      const report = await tx.report.create({
        data: {
          exchangeId: exchange.id,
          bookId: exchange.bookId,
          reporterId: reporter.id,
          reason,
          description: description || null,
          status: 'OPEN',
        },
        include: {
          exchange: {
            select: {
              id: true,
              status: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // 2. Update exchange status to DISPUTED
      // CRITICAL: This freezes points and prevents further actions
      // Points are NOT auto-refunded - admin resolution required
      await tx.exchange.update({
        where: { id: exchangeId },
        data: {
          status: 'DISPUTED',
        },
      })

      return report
    })

    return result
  } catch (error: any) {
    // Handle Prisma errors gracefully
    if (error.code === 'P2002') {
      // Unique constraint violation (duplicate report)
      throw new Error(
        'You have already reported this exchange with the same reason.'
      )
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      throw new Error('Unable to create report. Please verify the exchange exists.')
    }

    // Log the actual error for debugging, but return user-friendly message
    console.error('Report creation error:', error)
    throw new Error('Failed to create report. Please try again.')
  }
}

/**
 * Get a report by ID
 * 
 * Access Control:
 * - Only the reporter and exchange participants can view the report
 * 
 * @param reportId - Report UUID
 * @returns Report with related data
 */
export async function getReportById(reportId: string) {
  const user = await requireAuth()

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      exchange: {
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!report) {
    throw new Error('Report not found')
  }

  // Access control: Only reporter and exchange participants can view
  if (
    report.reporterId !== user.id &&
    report.exchange.fromUserId !== user.id &&
    report.exchange.toUserId !== user.id
  ) {
    throw new Error('Unauthorized: You do not have access to this report')
  }

  return report
}

/**
 * Get reports for a specific exchange
 * 
 * Access Control:
 * - Only exchange participants can view reports
 * 
 * @param exchangeId - Exchange UUID
 * @returns List of reports for the exchange
 */
export async function getReportsByExchange(exchangeId: string) {
  const user = await requireAuth()

  // First verify user has access to this exchange
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: {
      fromUserId: true,
      toUserId: true,
    },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Access control: Only exchange participants can view reports
  if (exchange.fromUserId !== user.id && exchange.toUserId !== user.id) {
    throw new Error(
      'Unauthorized: You do not have access to reports for this exchange'
    )
  }

  const reports = await prisma.report.findMany({
    where: { exchangeId },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return reports
}

/**
 * Get reports created by the current user
 * 
 * @returns List of reports created by the user
 */
export async function getUserReports() {
  const user = await requireAuth()

  const reports = await prisma.report.findMany({
    where: { reporterId: user.id },
    include: {
      exchange: {
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return reports
}

/**
 * Check if user can report an exchange
 * 
 * Validates all conditions for reporting:
 * - User is authenticated
 * - User is involved in the exchange
 * - Exchange is COMPLETED
 * - Rate limit not exceeded
 * 
 * @param exchangeId - Exchange UUID
 * @returns Object with canReport boolean and reason if false
 */
export async function canUserReportExchange(exchangeId: string) {
  try {
    const user = await requireAuth()

    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
    })

    if (!exchange) {
      return { canReport: false, reason: 'Exchange not found' }
    }

    // Check if user is involved
    if (
      exchange.fromUserId !== user.id &&
      exchange.toUserId !== user.id
    ) {
      return {
        canReport: false,
        reason: 'Only users involved in the exchange can report issues',
      }
    }

    // Check if exchange is COMPLETED
    if (exchange.status !== 'COMPLETED') {
      return {
        canReport: false,
        reason: `Cannot report exchange with status: ${exchange.status}. Only completed exchanges can be reported.`,
      }
    }

    // Check rate limit
    if (await checkRateLimit(user.id)) {
      return {
        canReport: false,
        reason: `You have exceeded the maximum number of reports (${MAX_REPORTS_PER_DAY}) in the last ${RATE_LIMIT_WINDOW_HOURS} hours.`,
      }
    }

    return { canReport: true }
  } catch (error: any) {
    return { canReport: false, reason: error.message || 'Unable to check report eligibility' }
  }
}

/**
 * ============================================
 * ADMIN FUNCTIONS - Report Resolution
 * ============================================
 * 
 * These functions are only accessible to admins.
 * They allow admins to:
 * - View all reports
 * - Resolve reports (mark as RESOLVED)
 * - Reject reports (mark as REJECTED)
 * - Handle exchange status when resolving reports
 */

/**
 * Get all reports (Admin only)
 * 
 * Returns all reports in the system for admin review.
 * 
 * @returns List of all reports with full details
 */
export async function getAllReports() {
  await requireAdmin()

  const reports = await prisma.report.findMany({
    include: {
      exchange: {
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          condition: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return reports
}

/**
 * Resolve a report (Admin only)
 * 
 * When a report is resolved:
 * - Report status → RESOLVED
 * - Exchange remains DISPUTED (admin has handled the issue)
 * - Points remain frozen (admin may have manually refunded/adjusted)
 * 
 * This indicates the admin has reviewed and resolved the issue.
 * 
 * @param reportId - Report UUID
 * @param adminNotes - Optional notes from admin (for future implementation)
 * @returns Updated report
 */
export async function resolveReport(
  reportId: string,
  adminNotes?: string
) {
  await requireAdmin()

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      exchange: true,
    },
  })

  if (!report) {
    throw new Error('Report not found')
  }

  // Update report status to RESOLVED
  // Exchange remains DISPUTED - admin has handled the issue
  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'RESOLVED',
      // Note: adminNotes could be added as a field in the future
    },
    include: {
      exchange: {
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return updatedReport
}

/**
 * Reject a report (Admin only)
 * 
 * When a report is rejected:
 * - Report status → REJECTED
 * - Exchange status → COMPLETED (report was invalid, no issue found)
 * - Points remain as they were (no refund needed)
 * 
 * This indicates the admin found no valid issue with the exchange.
 * 
 * @param reportId - Report UUID
 * @param adminNotes - Optional notes from admin (for future implementation)
 * @returns Updated report
 */
export async function rejectReport(
  reportId: string,
  adminNotes?: string
) {
  await requireAdmin()

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      exchange: true,
    },
  })

  if (!report) {
    throw new Error('Report not found')
  }

  // ATOMIC OPERATION: Reject report and restore exchange status
  // This ensures consistency: if report is invalid, exchange is valid
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update report status to REJECTED
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'REJECTED',
        },
        include: {
          exchange: {
            include: {
              fromUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
              toUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // 2. Check if there are other OPEN reports for this exchange
      // If all reports are resolved/rejected, we can restore exchange status
      const otherOpenReports = await tx.report.count({
        where: {
          exchangeId: report.exchangeId,
          status: 'OPEN',
          id: {
            not: reportId,
          },
        },
      })

      // 3. If no other OPEN reports, restore exchange to COMPLETED
      // This means the exchange was valid and all reports are handled
      if (otherOpenReports === 0) {
        await tx.exchange.update({
          where: { id: report.exchangeId },
          data: {
            status: 'COMPLETED',
          },
        })
      }

      return updatedReport
    })

    return result
  } catch (error: any) {
    console.error('Error rejecting report:', error)
    throw new Error('Failed to reject report. Please try again.')
  }
}

