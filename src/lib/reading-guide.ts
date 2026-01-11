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

Generate a reading guide with the following structure. CRITICAL: Return ONLY valid JSON, no markdown, no explanations, no code blocks, just the raw JSON object:

{
  "difficultyLevel": "Beginner",
  "recommendedReaderType": "A brief description of who would enjoy this book",
  "suggestedReadingPace": "A practical suggestion like '15-20 pages per day'",
  "tips": [
    "Tip 1: A helpful tip to understand the book better",
    "Tip 2: Another helpful tip",
    "Tip 3: One more tip"
  ]
}

STRICT REQUIREMENTS:
- difficultyLevel must be EXACTLY one of: "Beginner", "Intermediate", or "Advanced" (case-sensitive)
- recommendedReaderType: 1-2 sentences describing the ideal reader
- suggestedReadingPace: Practical and specific reading pace suggestion
- tips: Array of 3-5 helpful tips (strings only, no spoilers)
- Return ONLY the JSON object, nothing else - no markdown, no code blocks, no explanations`
}

/**
 * Parse JSON response from Gemini
 * 
 * @param response - Raw response from Gemini
 * @returns Parsed ReadingGuide or null if invalid
 */
function parseReadingGuideResponse(response: string): ReadingGuide | null {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = response.trim()
    
    // Remove markdown code blocks more aggressively
    // Handle ```json at start, ``` at end, or both
    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/g, '')
      .replace(/\s*```$/g, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    
    // Try to extract JSON from response (handle cases with extra text before/after)
    // Look for the first { and find matching closing brace using brace counting
    const firstBrace = cleanedResponse.indexOf('{')
    
    if (firstBrace === -1) {
      console.error('No opening brace found in response. First 500 chars:', cleanedResponse.substring(0, 500))
      return null
    }
    
    // Use brace counting to find the proper closing brace (handles nested objects and strings)
    let braceCount = 0
    let lastBrace = -1
    let inString = false
    let escapeNext = false
    
    for (let i = firstBrace; i < cleanedResponse.length; i++) {
      const char = cleanedResponse[i]
      
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        continue
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0) {
            lastBrace = i
            break
          }
        }
      }
    }
    
    // Declare jsonString - will be set in either branch
    let jsonString: string
    
    // If we didn't find a matching brace, the JSON might be incomplete (truncated by API)
    if (lastBrace === -1 || lastBrace <= firstBrace) {
      // JSON is incomplete (likely truncated by API) - try to reconstruct it
      jsonString = cleanedResponse.substring(firstBrace)
      
      // Find incomplete string values and close them
      // Look for patterns like: "property": "incomplete string value
      const incompleteStringPattern = /"([^"]+)"\s*:\s*"([^"]*)$/gm
      let match
      const matches: Array<{prop: string, value: string, index: number}> = []
      
      while ((match = incompleteStringPattern.exec(jsonString)) !== null) {
        const prop = match[1]
        const value = match[2]
        // Check if this is actually incomplete (no closing quote after the value)
        const afterMatch = jsonString.substring(match.index + match[0].length)
        if (!afterMatch.trim().startsWith('"') && !afterMatch.trim().startsWith(',')) {
          matches.push({ prop, value, index: match.index + match[0].length - value.length })
        }
      }
      
      // Close incomplete strings (work backwards to preserve indices)
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i]
        const valueStart = m.index + `"${m.prop}": "`.length
        const incompleteValue = jsonString.substring(valueStart)
        
        // Find where the value should end (before next property or end of JSON)
        const nextPropMatch = incompleteValue.match(/",\s*"[^"]+"\s*:/)
        const nextBraceMatch = incompleteValue.match(/",\s*}/)
        
        let endPos = incompleteValue.length
        if (nextPropMatch) {
          endPos = nextPropMatch.index!
        } else if (nextBraceMatch) {
          endPos = nextBraceMatch.index!
        }
        
        // Close the incomplete string
        const value = incompleteValue.substring(0, endPos).trim().replace(/\n/g, ' ')
        jsonString = jsonString.substring(0, valueStart) + value + '"' + jsonString.substring(valueStart + endPos)
      }
      
      // Handle incomplete tips array
      if (jsonString.includes('"tips"')) {
        const tipsMatch = jsonString.match(/"tips"\s*:\s*\[([^\]]*)$/m)
        if (tipsMatch && tipsMatch[1]) {
          const tipsContent = tipsMatch[1].trim()
          // If tips array is incomplete, try to close it
          if (!tipsContent.endsWith(']')) {
            // Check if last tip is incomplete
            const lastTipMatch = tipsContent.match(/"([^"]*)$/)
            if (lastTipMatch) {
              // Close the last tip and the array
              const completeTips = tipsContent.substring(0, tipsContent.length - lastTipMatch[1].length) + 
                                  lastTipMatch[1].trim() + '"'
              jsonString = jsonString.replace(/"tips"\s*:\s*\[([^\]]*)$/m, `"tips": [${completeTips}]`)
            } else {
              jsonString = jsonString.replace(/"tips"\s*:\s*\[([^\]]*)$/m, `"tips": [${tipsContent}]`)
            }
          }
        } else if (!jsonString.includes('"tips"')) {
          // Tips property exists but array is missing - add empty array
          jsonString = jsonString.replace(/"tips"\s*:\s*([^,}]*)/, '"tips": []')
        }
      }
      
      // Close the JSON object if needed
      const openBraces = (jsonString.match(/{/g) || []).length
      const closeBraces = (jsonString.match(/}/g) || []).length
      const missingBraces = openBraces - closeBraces
      if (missingBraces > 0) {
        jsonString = jsonString.trim() + '}'.repeat(missingBraces)
      }
      
      // Find the final closing brace
      lastBrace = jsonString.lastIndexOf('}')
      if (lastBrace === -1 || lastBrace <= firstBrace) {
        console.error('Could not reconstruct incomplete JSON. Response preview:', jsonString.substring(0, 500))
        return null
      }
      
      jsonString = jsonString.substring(0, lastBrace + 1)
    } else {
      // JSON is complete - extract it normally
      jsonString = cleanedResponse.substring(firstBrace, lastBrace + 1)
    }
    
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
    } catch (parseError: any) {
      // Try to fix common JSON issues
      // Remove trailing commas
      let fixedJson = jsonString
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*"/g, ',"') // Fix trailing commas before strings
      
      // Try to fix incomplete strings in the middle
      // If we have an unclosed string, try to close it
      const stringMatches = fixedJson.match(/"[^"]*$/g)
      if (stringMatches) {
        // We might have an incomplete string - this is tricky
        // For now, just try parsing again
      }
      
      try {
        parsed = JSON.parse(fixedJson)
      } catch (e: any) {
        console.error('Failed to parse JSON after fixes:', e.message)
        console.error('Original JSON string (first 1000 chars):', jsonString.substring(0, 1000))
        console.error('Fixed JSON string (first 1000 chars):', fixedJson.substring(0, 1000))
        return null
      }
    }

    // Validate and provide defaults for missing fields (handle incomplete JSON gracefully)
    if (!parsed.difficultyLevel) {
      console.warn('Missing difficultyLevel, using default: Intermediate')
      parsed.difficultyLevel = 'Intermediate'
    }

    if (!parsed.recommendedReaderType) {
      console.warn('Missing recommendedReaderType, using default')
      parsed.recommendedReaderType = 'Readers interested in this book'
    }

    if (!parsed.suggestedReadingPace) {
      console.warn('Missing suggestedReadingPace, using default')
      parsed.suggestedReadingPace = 'Take your time, 1-2 chapters per day'
    }

    if (!Array.isArray(parsed.tips)) {
      console.warn('Missing or invalid tips array, using defaults')
      parsed.tips = [
        'Take notes as you read to better understand the content',
        'Read in a quiet environment for better comprehension',
        'Review key concepts after each chapter'
      ]
    }

    // Validate difficulty level (case-insensitive)
    const validLevels = ['Beginner', 'Intermediate', 'Advanced']
    const difficultyLevel = String(parsed.difficultyLevel).trim()
    if (!validLevels.includes(difficultyLevel)) {
      // Try case-insensitive match
      const lowerLevel = difficultyLevel.toLowerCase()
      const matchedLevel = validLevels.find(level => level.toLowerCase() === lowerLevel)
      if (matchedLevel) {
        parsed.difficultyLevel = matchedLevel
      } else {
        console.warn('Invalid difficulty level:', difficultyLevel, ', defaulting to Intermediate')
        parsed.difficultyLevel = 'Intermediate'
      }
    }

    // Ensure tips is an array of strings with at least some content
    let validTips: string[] = []
    if (Array.isArray(parsed.tips)) {
      validTips = parsed.tips
        .filter((tip: any) => tip && typeof tip === 'string' && tip.trim().length > 0)
        .map((tip: string) => tip.trim())
        .slice(0, 5) // Limit to 5 tips max
    }

    // If we have no valid tips, provide defaults
    if (validTips.length === 0) {
      console.warn('No valid tips found, using defaults')
      validTips = [
        'Take notes as you read to better understand the content',
        'Read in a quiet environment for better comprehension',
        'Review key concepts after each chapter'
      ]
    }

    return {
      difficultyLevel: parsed.difficultyLevel,
      recommendedReaderType: String(parsed.recommendedReaderType).trim(),
      suggestedReadingPace: String(parsed.suggestedReadingPace).trim(),
      tips: validTips,
    }
  } catch (error) {
    console.error('Failed to parse reading guide response:', error)
    console.error('Response preview:', response.substring(0, 500))
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

