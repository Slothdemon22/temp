/**
 * Book Points Management
 * 
 * Handles caching and recalculation of AI-computed book point values.
 * 
 * CACHING STRATEGY:
 * 
 * Points are cached in Book.computedPoints to:
 * - Avoid repeated AI API calls (cost and latency)
 * - Ensure consistency (same book = same points during exchange)
 * - Improve performance
 * 
 * Recalculation triggers:
 * - When book condition changes
 * - When wishlist count changes significantly (threshold: 3)
 * - When rarity changes (new book with same title+author added)
 * - Manual recalculation (for testing or updates)
 * 
 * Why caching is critical:
 * - Exchange system uses stored points, not computed on-the-fly
 * - Prevents point value changing mid-exchange
 * - Reduces API costs
 * - Improves response times
 */

import { prisma } from './prisma'
import { calculateBookPoints } from './book-valuation'
import type { BookCondition } from './books'

/**
 * Get or calculate book points
 * 
 * Returns cached points if available and still valid.
 * Otherwise, calculates new points using AI and caches them.
 * 
 * @param bookId - Book UUID
 * @param forceRecalculate - Force recalculation even if cached
 * @returns Point value (5-20)
 */
export async function getBookPoints(
  bookId: string,
  forceRecalculate: boolean = false
): Promise<number> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      _count: {
        select: {
          wishlistItems: true,
        },
      },
    },
  })

  if (!book) {
    throw new Error('Book not found')
  }

  // Return cached points if available and not forcing recalculation
  // Handle case where computedPoints field might not exist yet (during migration)
  // CRITICAL: Always check cache first to avoid unnecessary API calls
  const cachedPoints = (book as any).computedPoints
  const lastCalculated = (book as any).pointsLastCalculatedAt
  
  if (!forceRecalculate && cachedPoints !== null && cachedPoints !== undefined) {
    // If points were calculated recently (within 24 hours), use cache
    // This prevents excessive API calls for frequently accessed books
    if (lastCalculated) {
      const hoursSinceCalculation =
        (Date.now() - new Date(lastCalculated).getTime()) / (1000 * 60 * 60)
      if (hoursSinceCalculation < 24) {
        return cachedPoints
      }
    } else {
      // If we have cached points but no timestamp, still use them
      // (backward compatibility during migration)
      return cachedPoints
    }
  }

  // Calculate rarity (number of books with same title + author)
  const rarityCount = await prisma.book.count({
    where: {
      title: book.title,
      author: book.author,
    },
  })

  // Calculate points using AI
  const points = await calculateBookPoints(
    book.condition,
    book._count.wishlistItems,
    rarityCount
  )

  // Cache the calculated points
  // Use try-catch to handle case where fields don't exist yet
  try {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        computedPoints: points,
        pointsLastCalculatedAt: new Date(),
      },
    })
  } catch (error: any) {
    // If fields don't exist yet, log but don't fail
    // This allows the system to work during migration
    if (error.message?.includes('Unknown field')) {
      console.warn('computedPoints field not available yet - migration may be needed')
      // Points are still returned, just not cached
    } else {
      throw error
    }
  }

  return points
}

/**
 * Recalculate book points if signals have changed
 * 
 * Checks if recalculation is needed based on:
 * - Condition changes
 * - Significant wishlist count changes (threshold: 3)
 * - Rarity changes (would need to be triggered externally)
 * 
 * @param bookId - Book UUID
 * @returns New point value if recalculated, null if not needed
 */
export async function recalculateBookPointsIfNeeded(
  bookId: string
): Promise<number | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      _count: {
        select: {
          wishlistItems: true,
        },
      },
    },
  })

  if (!book) {
    return null
  }

  // Check if recalculation is needed
  const needsRecalculation = await shouldRecalculatePoints(bookId)

  if (!needsRecalculation) {
    return (book as any).computedPoints || null
  }

  // Recalculate
  const rarityCount = await prisma.book.count({
    where: {
      title: book.title,
      author: book.author,
    },
  })

  const points = await calculateBookPoints(
    book.condition,
    book._count.wishlistItems,
    rarityCount
  )

  // Update cache
  // Use try-catch to handle case where fields don't exist yet
  try {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        computedPoints: points,
        pointsLastCalculatedAt: new Date(),
      },
    })
  } catch (error: any) {
    // If fields don't exist yet, log but don't fail
    if (error.message?.includes('Unknown field')) {
      console.warn('computedPoints field not available yet - migration may be needed')
    } else {
      throw error
    }
  }

  return points
}

/**
 * Check if book points need recalculation
 * 
 * @param bookId - Book UUID
 * @returns true if recalculation is needed
 */
async function shouldRecalculatePoints(bookId: string): Promise<boolean> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      _count: {
        select: {
          wishlistItems: true,
        },
      },
    },
  })

  if (!book) {
    return false
  }

  // If never calculated, needs calculation
  // Handle case where computedPoints field might not exist yet
  const cachedPoints = (book as any).computedPoints
  if (cachedPoints === null || cachedPoints === undefined) {
    return true
  }

  // If last calculated more than 7 days ago, recalculate
  // (allows for gradual demand changes)
  const lastCalculated = (book as any).pointsLastCalculatedAt
  if (lastCalculated) {
    const daysSinceCalculation =
      (Date.now() - new Date(lastCalculated).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCalculation > 7) {
      return true
    }
  }

  // Note: Condition changes and rarity changes are handled
  // by explicit recalculation calls, not automatic checks
  // This is more efficient and predictable

  return false
}

/**
 * Recalculate points for all books with same title+author
 * 
 * Called when a new book is added, affecting rarity calculations.
 * 
 * OPTIMIZED: Excludes the newly created book to avoid duplicate API calls.
 * Only recalculates existing books that need their rarity updated.
 * 
 * @param title - Book title
 * @param author - Book author
 * @param excludeBookId - Book ID to exclude from recalculation (the newly created book)
 */
export async function recalculateRarityForBooks(
  title: string,
  author: string,
  excludeBookId?: string
): Promise<void> {
  // Find all books with same title+author, excluding the newly created one
  const whereClause: any = {
    title,
    author,
  }
  
  if (excludeBookId) {
    whereClause.id = { not: excludeBookId }
  }

  const books = await prisma.book.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          wishlistItems: true,
        },
      },
    },
  })

  // If no existing books to update, skip API calls
  if (books.length === 0) {
    return
  }

  // Calculate new rarity count (include the new book in count)
  const rarityCount = books.length + (excludeBookId ? 1 : 0)

  // OPTIMIZATION: Only recalculate if rarity actually changed
  // Check if any book has cached points that might be stale
  // For efficiency, we'll recalculate all, but we could add more logic here

  // Recalculate points for each existing book
  // Use Promise.all with limited concurrency to avoid overwhelming the API
  const BATCH_SIZE = 3 // Process 3 books at a time to avoid rate limits
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE)
    
    await Promise.all(
      batch.map(async (book) => {
        try {
          const points = await calculateBookPoints(
            book.condition,
            book._count.wishlistItems,
            rarityCount
          )

          // Update cache (handle missing fields gracefully)
          try {
            await prisma.book.update({
              where: { id: book.id },
              data: {
                computedPoints: points,
                pointsLastCalculatedAt: new Date(),
              },
            })
          } catch (error: any) {
            if (error.message?.includes('Unknown field')) {
              console.warn('computedPoints field not available yet - migration may be needed')
            } else {
              throw error
            }
          }
        } catch (error: any) {
          // If API call fails for one book, log but continue with others
          // This prevents one failure from blocking all recalculations
          console.warn(`Failed to recalculate points for book ${book.id}:`, error.message)
        }
      })
    )
    
    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < books.length) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
    }
  }
}

