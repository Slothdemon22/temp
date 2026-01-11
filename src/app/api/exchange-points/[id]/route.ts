/**
 * Exchange Point API Route (Individual)
 * 
 * GET: Get exchange point by ID
 * PUT: Update exchange point (admin only)
 * DELETE: Delete exchange point (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getExchangePointById,
  updateExchangePoint,
  deleteExchangePoint,
} from '@/lib/exchange-points'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Exchange point ID is required' },
        { status: 400 }
      )
    }

    const exchangePoint = await getExchangePointById(id)

    if (!exchangePoint) {
      return NextResponse.json(
        { error: 'Exchange point not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ exchangePoint })
  } catch (error: any) {
    console.error('Error fetching exchange point:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange point' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Exchange point ID is required' },
        { status: 400 }
      )
    }

    const exchangePoint = await updateExchangePoint(id, body)
    return NextResponse.json({ exchangePoint })
  } catch (error: any) {
    console.error('Error updating exchange point:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update exchange point' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Exchange point ID is required' },
        { status: 400 }
      )
    }

    await deleteExchangePoint(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting exchange point:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete exchange point' },
      { status: 500 }
    )
  }
}


