/**
 * AI-Powered Reading Guide Service
 * 
 * This module generates personalized reading guides for books using AI.
 * The guide helps users understand:
 * - Difficulty level (Beginner / Intermediate / Advanced)
 * - Recommended reader type
 * - Suggested reading pace
 * - Tips to understand the book better
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 
 * 1. No Spoilers:
 *    - Guide does NOT include plot spoilers
 *    - Does NOT quote book text
 *    - Focuses on reading approach, not content details
 * 
 * 2. Caching:
 *    - Results are cached per book to avoid repeated API calls
 *    - Cache is stored in-memory (can be upgraded to database later)
 *    - Cache key: bookId
 * 
 * 3. Server-Side Only:
 *    - All Gemini API calls happen on the server
 *    - API key never exposed to client
 * 
 * 4. Graceful Failures:
 *    - If AI fails, returns null (UI handles gracefully)
 *    - Never blocks book page from loading
 */

import { callGeminiAPI } from './gemini'
import { prisma } from './prisma'

/**
 * Reading Guide Response Structure
 */
export interface ReadingGuide {
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced'
  recommendedReaderType: string
  suggestedReadingPace: string
  tips: string[]
}

/**
 * In-memory cache for reading guides
 * Key: bookId, Value: ReadingGuide
 * 
 * Note: In production, consider using Redis or database field for persistence
 */
const readingGuideCache = new Map<string, ReadingGuide>()

/**
 * Compile community notes from book history entries
 * 
 * @param bookId - Book UUID
 * @returns Compiled notes string
 */
async function compileCommunityNotes(bookId: string): Promise<string> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      historyEntries: {
        where: {
          notes: {
            not: null,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Limit to most recent 10 entries with notes
      },
    },
  })

  if (!book || book.historyEntries.length === 0) {
    return 'No community notes available yet.'
  }

  // Compile notes from history entries
  const notes = book.historyEntries
    .map((entry) => {
      const parts: string[] = []
      if (entry.notes) {
        parts.push(entry.notes)
      }
      return parts.length > 0 ? parts.join(' ') : null
    })
    .filter(Boolean)
    .join(' ')

  return notes || 'No detailed community notes available yet.'
}

/**
 * Construct the prompt for reading guide generation
 * 
 * @param bookMetadata - Book information
 * @param communityNotes - Compiled notes from previous readers
 * @returns Prompt string
 */
function constructReadingGuidePrompt(
  bookMetadata: {
    title: string
    author: string
    description: string | null
  },
  communityNotes: string
): string {
  return `You are an AI assistant helping readers understand if a book suits their reading level and how to approach it.

Book Information:
Title: ${bookMetadata.title}
Author: ${bookMetadata.author}
Description: ${bookMetadata.description || 'No description available.'}

Community Notes from Previous Readers:
${communityNotes}

IMPORTANT RULES:
1. Do NOT include any spoilers
2. Do NOT quote text from the book
3. Keep output concise and structured
4. Focus on reading approach, not plot details
5. Be helpful and encouraging

Generate a reading guide with the following structure (respond in JSON format only):

{
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "recommendedReaderType": "A brief description of who would enjoy this book (e.g., 'Fiction enthusiasts looking for character-driven narratives', 'Readers interested in historical fiction', etc.)",
  "suggestedReadingPace": "A practical suggestion (e.g., '15-20 pages per day', 'Read in 2-3 sessions', 'Take your time, 1-2 chapters per day', etc.)",
  "tips": [
    "Tip 1: A helpful tip to understand the book better",
    "Tip 2: Another helpful tip",
    "Tip 3: One more tip"
  ]
}

Requirements:
- difficultyLevel must be exactly one of: "Beginner", "Intermediate", or "Advanced"
- recommendedReaderType should be 1-2 sentences describing the ideal reader
- suggestedReadingPace should be practical and specific
- tips should be an array of 3-5 helpful tips (no spoilers)
- All tips should help readers understand the book better without revealing plot details
- Return ONLY valid JSON, no additional text before or after`
}

/**
 * Parse JSON response from Gemini
 * 
 * @param response - Raw response from Gemini
 * @returns Parsed ReadingGuide or null if invalid
 */
function parseReadingGuideResponse(response: string): ReadingGuide | null {
  try {
    // Try to extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate structure
    if (
      !parsed.difficultyLevel ||
      !parsed.recommendedReaderType ||
      !parsed.suggestedReadingPace ||
      !Array.isArray(parsed.tips)
    ) {
      return null
    }

    // Validate difficulty level
    const validLevels = ['Beginner', 'Intermediate', 'Advanced']
    if (!validLevels.includes(parsed.difficultyLevel)) {
      return null
    }

    return {
      difficultyLevel: parsed.difficultyLevel,
      recommendedReaderType: parsed.recommendedReaderType,
      suggestedReadingPace: parsed.suggestedReadingPace,
      tips: parsed.tips.filter((tip: any) => typeof tip === 'string'),
    }
  } catch (error) {
    console.error('Failed to parse reading guide response:', error)
    return null
  }
}

/**
 * Generate a reading guide for a book
 * 
 * @param bookId - Book UUID
 * @param forceRefresh - If true, bypass cache and regenerate
 * @returns Reading guide or null if generation fails
 */
export async function generateReadingGuide(
  bookId: string,
  forceRefresh: boolean = false
): Promise<ReadingGuide | null> {
  // Check cache first (unless forcing refresh)
  if (!forceRefresh && readingGuideCache.has(bookId)) {
    return readingGuideCache.get(bookId) || null
  }

  try {
    // Get book metadata
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
      },
    })

    if (!book) {
      return null
    }

    // Compile community notes
    const communityNotes = await compileCommunityNotes(bookId)

    // Construct prompt
    const prompt = constructReadingGuidePrompt(
      {
        title: book.title,
        author: book.author,
        description: book.description,
      },
      communityNotes
    )

    // Call Gemini API
    const response = await callGeminiAPI(prompt)

    // Parse response
    const readingGuide = parseReadingGuideResponse(response)

    if (!readingGuide) {
      console.error('Failed to parse reading guide for book:', bookId)
      return null
    }

    // Cache the result
    readingGuideCache.set(bookId, readingGuide)

    return readingGuide
  } catch (error: any) {
    // Handle errors gracefully
    console.error('Reading guide generation failed:', error)
    return null
  }
}

/**
 * Get reading guide for a book (from cache or generate)
 * 
 * @param bookId - Book UUID
 * @returns Reading guide or null
 */
export async function getReadingGuide(bookId: string): Promise<ReadingGuide | null> {
  return generateReadingGuide(bookId, false)
}

