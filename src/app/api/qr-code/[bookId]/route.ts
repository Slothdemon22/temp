/**
 * QR Code API Route
 * 
 * Generates QR code image for a book's history page.
 * Returns PNG image that can be used in <img> tags.
 * 
 * This is a server-side route to ensure:
 * - QR codes are generated with proper settings
 * - No client-side dependencies
 * - Consistent quality and size
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateBookQRCode } from '@/lib/qr-code'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      )
    }

    // Get base URL - prioritize environment variables for production
    // This ensures QR codes work correctly when deployed
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL

    // If not set, try Vercel URL (for Vercel deployments)
    if (!baseUrl && process.env.VERCEL_URL) {
      const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'http'
      baseUrl = `${protocol}://${process.env.VERCEL_URL}`
    }

    // Fallback to origin header (for development or when env vars not set)
    if (!baseUrl) {
      baseUrl = request.headers.get('origin') || ''
    }

    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '')

    // Generate QR code as data URL
    const dataUrl = await generateBookQRCode(bookId, baseUrl)

    // Convert data URL to buffer for PNG response
    const base64Data = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Return as PNG image
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year (QR codes don't change)
      },
    })
  } catch (error: any) {
    console.error('QR code generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}

