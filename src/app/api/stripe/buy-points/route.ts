/**
 * API Route: Buy Points
 * 
 * Allows users to purchase points using Stripe
 * 
 * Pricing: $1 = 10 points (configurable)
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentUser } from '@/lib/auth-helpers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

// Pricing: $1 USD = 10 points
const POINTS_PER_DOLLAR = 10

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { points } = body

    if (!points || points <= 0 || !Number.isInteger(points)) {
      return NextResponse.json(
        { error: 'Valid number of points is required' },
        { status: 400 }
      )
    }

    // Calculate amount in dollars
    const amount = points / POINTS_PER_DOLLAR

    // Minimum purchase: $1 (10 points)
    if (amount < 1) {
      return NextResponse.json(
        { error: 'Minimum purchase is 10 points ($1)' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${points} Points`,
              description: `Purchase ${points} points for book exchanges`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/stripe/success?session_id={CHECKOUT_SESSION_ID}&points=${points}`,
      cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/stripe/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email,
        points: points.toString(),
        type: 'points_purchase',
      },
    })

    return NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
        points,
        amount,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Stripe buy points error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

