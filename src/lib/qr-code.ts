/**
 * QR Code Generation Utilities
 * 
 * Generates permanent QR codes for books that link to their history pages.
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 
 * 1. QR Code is PERMANENT:
 *    - Generated once when book is created
 *    - Never regenerated
 *    - Never reassigned
 *    - Links to permanent URL: /book-history/{bookId}
 * 
 * 2. QR Code URL Structure:
 *    - Format: {baseUrl}/book-history/{bookId}
 *    - Public and accessible without authentication
 *    - Book ID is permanent (UUID)
 * 
 * 3. Why This Design:
 *    - Prevents fraud (can't regenerate QR for different book)
 *    - Maintains book identity across ownership changes
 *    - Enables physical-to-digital connection
 * 
 * 4. QR Code Generation:
 *    - Server-side generation using 'qrcode' package
 *    - High contrast (black on white) for easy scanning
 *    - Minimum 256x256 pixels
 *    - Includes quiet zone (margin) for better scanning
 */

import QRCode from 'qrcode'

  /**
 * Get the public base URL for the application
 * 
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicitly set)
 * 2. VERCEL_URL (Vercel deployment)
 * 3. Empty string (fallback to relative URL - not recommended for production)
 * 
 * @returns Base URL without trailing slash
 */
function getPublicBaseUrl(): string {
  // Priority 1: Explicitly set public URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') // Remove trailing slash
  }

  // Priority 2: Vercel URL (for Vercel deployments)
  if (process.env.VERCEL_URL) {
    const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'http'
    return `${protocol}://${process.env.VERCEL_URL}`
  }

  // Fallback: empty string (will create relative URL)
  // This should only happen in development
  return ''
}

/**
 * Generate QR code URL for a book
 * 
 * This URL is permanent and never changes.
 * The bookId is a UUID that remains constant throughout the book's lifetime.
 * 
 * @param bookId - Book UUID
 * @param baseUrl - Base URL of the application (optional, will use environment variables if not provided)
 * @returns Full URL to book history page
 */
export function generateBookHistoryUrl(
  bookId: string,
  baseUrl?: string
): string {
  // Use provided baseUrl, or get from environment
  const url = baseUrl || getPublicBaseUrl()

  // Remove trailing slash if present
  const cleanUrl = url.replace(/\/$/, '')

  // Construct permanent URL
  // This URL never changes - bookId is permanent
  return `${cleanUrl}/book-history/${bookId}`
}

/**
 * Generate QR code as data URL (PNG)
 * 
 * Server-side function that generates a QR code image as a data URL.
 * This can be used directly in <img> tags.
 * 
 * Requirements:
 * - Minimum size: 256x256 pixels
 * - High contrast: black on white
 * - Quiet zone (margin) included
 * - Error correction level: High (H) for reliability
 * 
 * @param url - Full URL to encode in QR code
 * @returns Data URL (data:image/png;base64,...) that can be used in <img src>
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  try {
    // Generate QR code as data URL
    // Options:
    // - width: 256 (minimum size for good scanning)
    // - margin: 2 (quiet zone for better scanning)
    // - color: High contrast black on white
    // - errorCorrectionLevel: 'H' (High - 30% error correction)
    const dataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2, // Quiet zone (margin) for better scanning
      color: {
        dark: '#000000', // Black QR code
        light: '#FFFFFF', // White background
      },
      errorCorrectionLevel: 'H', // High error correction (30%) for reliability
    })

    return dataUrl
  } catch (error: any) {
    console.error('Failed to generate QR code:', error)
    throw new Error(`Failed to generate QR code: ${error.message}`)
  }
}

/**
 * Generate QR code for a book's history page
 * 
 * Convenience function that generates the URL and QR code in one call.
 * 
 * @param bookId - Book UUID
 * @param baseUrl - Base URL of the application (optional)
 * @returns Data URL for the QR code image
 */
export async function generateBookQRCode(
  bookId: string,
  baseUrl?: string
): Promise<string> {
  const url = generateBookHistoryUrl(bookId, baseUrl)
  return generateQRCodeDataUrl(url)
}

