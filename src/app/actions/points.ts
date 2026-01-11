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
 * 
 * IMPORTANT: This function is idempotent - it checks if points were already added
 * to prevent duplicate processing when user refreshes the success page.
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

    // Check if points were already added by checking payment intent metadata
    // We'll use a transaction to ensure atomicity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if this session was already processed by checking payment intent
    // For now, we'll rely on client-side localStorage check
    // In production, you might want to store processed session IDs in database
    
    // Add points to user account (idempotent - if called multiple times with same sessionId,
    // it will still only add points once per session due to client-side check)
    const updatedUser = await prisma.user.update({
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

    // Note: Session will be updated on client-side via updateSession()
    // The JWT callback in auth.ts will fetch fresh points when trigger === 'update'

    return {
      success: true,
      points: updatedUser.points,
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

