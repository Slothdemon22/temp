/**
 * Exchange Points API Route
 * 
 * GET: Get all active exchange points (public)
 * POST: Create new exchange point (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveExchangePoints,
  getAllExchangePoints,
  createExchangePoint,
} from '@/lib/exchange-points'
import { isAdmin } from '@/lib/admin-helpers'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const all = searchParams.get('all') === 'true'

    // If 'all=true' and user is admin, return all exchange points
    if (all) {
      const adminStatus = await isAdmin()
      if (adminStatus) {
        const points = await getAllExchangePoints()
        return NextResponse.json({ exchangePoints: points })
      }
    }

    // Otherwise, return only active exchange points
    const points = await getActiveExchangePoints()
    return NextResponse.json({ exchangePoints: points })
  } catch (error: any) {
    console.error('Error fetching exchange points:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange points' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, address, city, country, latitude, longitude } = body

    // Validation
    if (!name || !address || !city || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, address, city, latitude, longitude' },
        { status: 400 }
      )
    }

    const exchangePoint = await createExchangePoint({
      name,
      description,
      address,
      city,
      country,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    })

    return NextResponse.json({ exchangePoint }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating exchange point:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create exchange point' },
      { status: 500 }
    )
  }
}

