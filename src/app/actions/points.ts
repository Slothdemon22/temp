/**
 * Server Actions for Points Management
 */

'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

/**
 * Add points to user account after successful payment
 */
export async function addPointsAfterPayment(sessionId: string) {
  try {
    // Verify the Stripe session was paid
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed')
    }

    // Verify this is a points purchase
    if (session.metadata?.type !== 'points_purchase') {
      throw new Error('Invalid payment session type')
    }

    const userId = session.metadata?.userId
    const points = parseInt(session.metadata?.points || '0')

    if (!userId || !points || points <= 0) {
      throw new Error('Invalid payment session metadata')
    }

    // Add points to user account
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points,
        },
      },
      select: {
        id: true,
        points: true,
      },
    })

    return {
      success: true,
      points: user.points,
      pointsAdded: points,
    }
  } catch (error: any) {
    console.error('Error adding points:', error)
    throw new Error(error.message || 'Failed to add points')
  }
}

/**
 * Check if user has books available to give away
 */
export async function hasBooksToGiveAway(userId?: string) {
  try {
    const user = userId ? await prisma.user.findUnique({
      where: { id: userId },
    }) : await requireAuth()

    if (!user) {
      return false
    }

    // Check if user has any available books
    const availableBooks = await prisma.book.count({
      where: {
        currentOwnerId: user.id,
        isAvailable: true,
      },
    })

    return availableBooks > 0
  } catch (error) {
    console.error('Error checking books:', error)
    return false
  }
}

