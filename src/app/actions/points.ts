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
 * IMPORTANT: This function is idempotent - it uses Stripe payment intent metadata
 * to prevent duplicate processing when user refreshes the success page.
 */
export async function addPointsAfterPayment(sessionId: string) {
  try {
    // Verify the Stripe session was paid
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })

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

    // Get payment intent for idempotency check
    const paymentIntent = session.payment_intent
    let paymentIntentId: string | null = null
    
    if (typeof paymentIntent === 'string') {
      paymentIntentId = paymentIntent
    } else if (paymentIntent && typeof paymentIntent === 'object' && 'id' in paymentIntent) {
      paymentIntentId = paymentIntent.id
    }

    // Check if points were already added by checking payment intent metadata
    if (paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      
      // If metadata indicates points were already added, return current points without adding
      if (intent.metadata?.points_added === 'true' && intent.metadata?.session_id === sessionId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, points: true },
        })
        
        if (!user) {
          throw new Error('User not found')
        }
        
        return {
          success: true,
          points: user.points,
          pointsAdded: 0, // Already added
        }
      }
    }

    // Get current user points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Add points to user account
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

    // Mark payment intent as processed to prevent duplicate processing
    if (paymentIntentId) {
      try {
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            points_added: 'true',
            session_id: sessionId,
            processed_at: new Date().toISOString(),
          },
        })
      } catch (metadataError) {
        // Log but don't fail - points were already added
        console.warn('Failed to update payment intent metadata:', metadataError)
      }
    }

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

