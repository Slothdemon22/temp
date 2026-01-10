/**
 * Exchange Management Utilities
 * 
 * Handles the complete exchange lifecycle:
 * - Request exchange
 * - Approve/reject exchanges
 * - Ownership transfer
 * - Point management
 * - Anti-abuse safeguards
 * 
 * CRITICAL DESIGN DECISIONS:
 * 
 * 1. Points Deduction Timing:
 *    - Points are NOT deducted on request (allows rejection without penalty)
 *    - Points are deducted ONLY on approval (prevents point farming)
 *    - Owner earns points equal to book value (reward for sharing)
 * 
 * 2. Ownership Transfer:
 *    - Book ownership is TRANSFERRED, not duplicated
 *    - Book ID remains constant (preserves QR history)
 *    - Only currentOwnerId changes
 * 
 * 3. Atomic Operations:
 *    - All critical updates use Prisma transactions
 *    - Ensures data consistency (points + ownership + exchange status)
 *    - Prevents race conditions
 */

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// Time window for detecting repeat exchanges (7 days)
const REPEAT_EXCHANGE_WINDOW_DAYS = 7

/**
 * Get book point value
 * 
 * Uses AI-computed points stored in Book.computedPoints.
 * If not yet calculated, calculates and caches them.
 * 
 * CRITICAL: Exchange system uses STORED points, not computed on-the-fly.
 * This ensures:
 * - Consistency during exchange (points don't change mid-transaction)
 * - Performance (no API calls during exchange)
 * - Fairness (same book = same points for all requesters)
 */
async function getBookPointValue(bookId: string): Promise<number> {
  const { getBookPoints } = await import('./book-points')
  return getBookPoints(bookId, false) // Use cached value if available
}

/**
 * Check for repeat exchanges between two users
 * 
 * Anti-abuse: Prevents the same two users from exchanging repeatedly
 * within a short time window. This prevents point farming.
 * 
 * @param fromUserId - Owner user ID
 * @param toUserId - Requester user ID
 * @returns true if repeat exchange detected
 */
async function checkRepeatExchange(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - REPEAT_EXCHANGE_WINDOW_DAYS)

  // Check for recent completed exchanges between these users
  const recentExchanges = await prisma.exchange.findMany({
    where: {
      OR: [
        // User A gave to User B
        {
          fromUserId,
          toUserId,
          status: 'COMPLETED',
          completedAt: {
            gte: windowStart,
          },
        },
        // User B gave to User A (circular pattern)
        {
          fromUserId: toUserId,
          toUserId: fromUserId,
          status: 'COMPLETED',
          completedAt: {
            gte: windowStart,
          },
        },
      ],
    },
  })

  return recentExchanges.length > 0
}

/**
 * Check for circular exchange patterns
 * 
 * Anti-abuse: Blocks patterns like A → B → A
 * This prevents users from gaming the system by exchanging back and forth.
 * 
 * @param fromUserId - Owner user ID
 * @param toUserId - Requester user ID
 * @returns true if circular pattern detected
 */
async function checkCircularExchange(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  // Check if there's a recent exchange in the reverse direction
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - REPEAT_EXCHANGE_WINDOW_DAYS)

  const reverseExchange = await prisma.exchange.findFirst({
    where: {
      fromUserId: toUserId, // Requester was previously an owner
      toUserId: fromUserId, // Current owner was previously a requester
      status: 'COMPLETED',
      completedAt: {
        gte: windowStart,
      },
    },
  })

  return !!reverseExchange
}

/**
 * Request an exchange for a book
 * 
 * Rules:
 * - Requester must NOT be the owner
 * - Book must be available
 * - Requester must have sufficient points
 * - Book must not have an active exchange
 * - No repeat exchanges within time window
 * - No circular exchange patterns
 * 
 * Points are NOT deducted at this stage (only on approval)
 * 
 * @param bookId - Book UUID
 * @returns Created exchange
 */
export async function requestExchange(bookId: string) {
  const requester = await requireAuth()

  // Get book with owner information
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      currentOwner: {
        select: {
          id: true,
          points: true,
        },
      },
      exchanges: {
        where: {
          status: {
            in: ['REQUESTED', 'APPROVED'], // Active exchanges
          },
        },
      },
    },
  })

  if (!book) {
    throw new Error('Book not found')
  }

  // Validation: Requester must NOT be the owner
  if (book.currentOwnerId === requester.id) {
    throw new Error('You cannot request your own book')
  }

  // Validation: Book must be available
  if (!book.isAvailable) {
    throw new Error('This book is not available for exchange')
  }

  // Validation: Book must not have an active exchange
  if (book.exchanges.length > 0) {
    throw new Error('This book already has an active exchange request')
  }

  // Get AI-computed points (uses cached value if available)
  const requiredPoints = await getBookPointValue(book.id)

  // Validation: Requester must have sufficient points
  // Note: We check the requester's current points, but don't deduct yet
  const requesterUser = await prisma.user.findUnique({
    where: { id: requester.id },
    select: { points: true },
  })

  if (!requesterUser || requesterUser.points < requiredPoints) {
    throw new Error(
      `Insufficient points. Required: ${requiredPoints}, Available: ${requesterUser?.points || 0}`
    )
  }

  // Anti-abuse: Check for repeat exchanges
  if (await checkRepeatExchange(book.currentOwnerId, requester.id)) {
    throw new Error(
      `You cannot exchange with this user again within ${REPEAT_EXCHANGE_WINDOW_DAYS} days`
    )
  }

  // Anti-abuse: Check for circular exchanges
  if (await checkCircularExchange(book.currentOwnerId, requester.id)) {
    throw new Error(
      'Circular exchange pattern detected. Please wait before exchanging again.'
    )
  }

  // Create exchange request
  // Status is REQUESTED - points are NOT deducted yet
  try {
    const exchange = await prisma.exchange.create({
      data: {
        bookId: book.id,
        fromUserId: book.currentOwnerId, // Current owner
        toUserId: requester.id, // Requester
        pointsUsed: requiredPoints, // Points that will be deducted on approval
        status: 'REQUESTED',
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
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
    })

    return exchange
  } catch (error: any) {
    // Handle Prisma errors gracefully
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      throw new Error('Unable to create exchange. Please try again.')
    }
    
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('An exchange request already exists for this book.')
    }

    // Log the actual error for debugging, but return user-friendly message
    console.error('Exchange creation error:', error)
    throw new Error('Failed to create exchange request. Please try again.')
  }
}

/**
 * Approve an exchange request
 * 
 * CRITICAL: This is an atomic operation that:
 * 1. Deducts points from requester
 * 2. Awards points to owner
 * 3. Transfers book ownership
 * 4. Updates exchange status
 * 
 * All of this happens in a single transaction to ensure consistency.
 * 
 * @param exchangeId - Exchange UUID
 */
export async function approveExchange(exchangeId: string) {
  const owner = await requireAuth()

  // Get exchange with book and user information
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    include: {
      book: {
        include: {
          currentOwner: {
            select: {
              id: true,
              points: true,
            },
          },
        },
      },
      toUser: {
        select: {
          id: true,
          points: true,
        },
      },
    },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Validation: Only the owner can approve
  if (exchange.fromUserId !== owner.id) {
    throw new Error('Only the book owner can approve this exchange')
  }

  // Validation: Exchange must be in REQUESTED status
  if (exchange.status !== 'REQUESTED') {
    throw new Error(`Cannot approve exchange with status: ${exchange.status}`)
  }

  // Validation: Book must still be available
  if (!exchange.book.isAvailable) {
    throw new Error('Book is no longer available')
  }

  // Validation: Requester must still have sufficient points
  if (exchange.toUser.points < exchange.pointsUsed) {
    throw new Error('Requester no longer has sufficient points')
  }

  // ATOMIC OPERATION: Update everything in a single transaction
  // This ensures:
  // - Points are deducted and awarded atomically
  // - Ownership is transferred atomically
  // - Exchange status is updated atomically
  // If any step fails, everything rolls back
  try {
    const result = await prisma.$transaction(async (tx) => {
    // 1. Deduct points from requester
    await tx.user.update({
      where: { id: exchange.toUserId },
      data: {
        points: {
          decrement: exchange.pointsUsed,
        },
      },
    })

    // 2. Award points to owner (equal to book value)
    await tx.user.update({
      where: { id: exchange.fromUserId },
      data: {
        points: {
          increment: exchange.pointsUsed,
        },
      },
    })

    // 3. Transfer book ownership
    // CRITICAL: We UPDATE the book, not create a new one
    // This preserves the book ID for QR history
    await tx.book.update({
      where: { id: exchange.bookId },
      data: {
        currentOwnerId: exchange.toUserId, // New owner
        isAvailable: false, // Temporarily unavailable during transfer
      },
    })

    // 4. Mark exchange as COMPLETED
    const updatedExchange = await tx.exchange.update({
      where: { id: exchangeId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            currentOwnerId: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            name: true,
            points: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            points: true,
          },
        },
      },
    })

    // 5. Make book available again for the new owner
    await tx.book.update({
      where: { id: exchange.bookId },
      data: {
        isAvailable: true, // New owner can list it again
      },
    })

    return updatedExchange
    })

    return result
  } catch (error: any) {
    // Handle Prisma errors gracefully
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      throw new Error('Unable to complete exchange. Please try again.')
    }
    
    if (error.code === 'P2025') {
      // Record not found
      throw new Error('Exchange or related records not found. Please refresh and try again.')
    }

    // Log the actual error for debugging, but return user-friendly message
    console.error('Exchange approval error:', error)
    throw new Error('Failed to approve exchange. Please try again.')
  }
}

/**
 * Reject an exchange request
 * 
 * Rules:
 * - Only the owner can reject
 * - No points are affected
 * - Exchange status is set to REJECTED
 * 
 * @param exchangeId - Exchange UUID
 */
export async function rejectExchange(exchangeId: string) {
  const owner = await requireAuth()

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Validation: Only the owner can reject
  if (exchange.fromUserId !== owner.id) {
    throw new Error('Only the book owner can reject this exchange')
  }

  // Validation: Exchange must be in REQUESTED status
  if (exchange.status !== 'REQUESTED') {
    throw new Error(`Cannot reject exchange with status: ${exchange.status}`)
  }

  // Reject exchange (no points affected)
  const rejectedExchange = await prisma.exchange.update({
    where: { id: exchangeId },
    data: {
      status: 'REJECTED',
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
        },
      },
      toUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return rejectedExchange
}

/**
 * Cancel an exchange request (by requester)
 * 
 * Rules:
 * - Only the requester can cancel
 * - Only REQUESTED exchanges can be cancelled
 * - No points are affected
 * 
 * @param exchangeId - Exchange UUID
 */
export async function cancelExchange(exchangeId: string) {
  const requester = await requireAuth()

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Validation: Only the requester can cancel
  if (exchange.toUserId !== requester.id) {
    throw new Error('Only the requester can cancel this exchange')
  }

  // Validation: Only REQUESTED exchanges can be cancelled
  if (exchange.status !== 'REQUESTED') {
    throw new Error(`Cannot cancel exchange with status: ${exchange.status}`)
  }

  // Delete the exchange (since it's not approved, we can safely delete)
  await prisma.exchange.delete({
    where: { id: exchangeId },
  })
}

/**
 * Dispute an exchange
 * 
 * Rules:
 * - Either party can dispute
 * - Points are frozen (not reverted)
 * - Ownership is NOT reverted automatically
 * - Admin resolution required (can be mocked for hackathon)
 * 
 * @param exchangeId - Exchange UUID
 * @param reason - Reason for dispute
 */
export async function disputeExchange(
  exchangeId: string,
  reason: string
) {
  const user = await requireAuth()

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
  })

  if (!exchange) {
    throw new Error('Exchange not found')
  }

  // Validation: Only parties involved can dispute
  if (
    exchange.fromUserId !== user.id &&
    exchange.toUserId !== user.id
  ) {
    throw new Error('Only parties involved in the exchange can dispute it')
  }

  // Validation: Only COMPLETED exchanges can be disputed
  if (exchange.status !== 'COMPLETED') {
    throw new Error(`Cannot dispute exchange with status: ${exchange.status}`)
  }

  // Mark as disputed
  // Note: Points and ownership remain unchanged (frozen)
  // Admin can resolve later
  const disputedExchange = await prisma.exchange.update({
    where: { id: exchangeId },
    data: {
      status: 'DISPUTED',
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  return disputedExchange
}

/**
 * Get exchanges for a user
 * 
 * @param userId - User ID (optional, defaults to current user)
 * @returns List of exchanges
 */
export async function getUserExchanges(userId?: string) {
  const user = await requireAuth()
  const targetUserId = userId || user.id

  // Only allow users to see their own exchanges
  if (targetUserId !== user.id) {
    throw new Error('Unauthorized: You can only view your own exchanges')
  }

  const exchanges = await prisma.exchange.findMany({
    where: {
      OR: [
        { fromUserId: targetUserId }, // Exchanges where user is owner
        { toUserId: targetUserId }, // Exchanges where user is requester
      ],
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          condition: true,
        },
      },
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
    orderBy: {
      createdAt: 'desc',
    },
  })

  return exchanges
}

/**
 * Get pending exchange requests for a user's books
 * 
 * @returns List of pending exchange requests
 */
export async function getPendingExchangeRequests() {
  const owner = await requireAuth()

  const exchanges = await prisma.exchange.findMany({
    where: {
      fromUserId: owner.id, // User is the owner
      status: 'REQUESTED', // Pending requests
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          condition: true,
        },
      },
      toUser: {
        select: {
          id: true,
          name: true,
          points: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return exchanges
}

