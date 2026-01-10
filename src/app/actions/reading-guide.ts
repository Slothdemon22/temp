/**
 * Server Actions for Reading Guide
 * 
 * These are Next.js Server Actions for fetching reading guides.
 */

'use server'

import { getReadingGuide } from '@/lib/reading-guide'

/**
 * Server Action: Get reading guide for a book
 */
export async function getReadingGuideAction(bookId: string) {
  try {
    const guide = await getReadingGuide(bookId)
    
    if (!guide) {
      return { success: false, error: 'Unable to generate reading guide at this time.' }
    }

    return { success: true, guide }
  } catch (error: any) {
    // Handle errors gracefully - don't block the page
    console.error('Reading guide action error:', error)
    return { 
      success: false, 
      error: 'Unable to generate reading guide at this time. Please try again later.' 
    }
  }
}

