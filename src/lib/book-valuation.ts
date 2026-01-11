/**
 * AI-Based Book Valuation System
 * 
 * This module calculates dynamic point values for books using AI (Google Gemini)
 * based on real-world signals: condition, demand (wishlist), and rarity.
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 
 * 1. Deterministic Output:
 *    - Output is always an integer between 5-20
 *    - No decimals or explanations
 *    - Bounded range ensures fairness
 * 
 * 2. Caching Strategy:
 *    - Computed points are stored in Book.computedPoints
 *    - Recalculated only when signals change significantly
 *    - Prevents repeated API calls and ensures consistency
 * 
 * 3. Fallback Logic:
 *    - If Gemini API fails, use deterministic heuristic
 *    - Ensures system always produces a value
 *    - Maintains fairness even during API outages
 * 
 * 4. Anti-Abuse:
 *    - Output is strictly clamped to 5-20 range
 *    - Inputs are validated (no user-controlled free text)
 *    - AI response is validated before use
 */

import { callGeminiAPI } from './gemini'
import type { BookCondition } from './books'

/**
 * Deterministic fallback calculation
 * 
 * Used when Gemini API fails or is unavailable.
 * This ensures the system always produces a fair value.
 * 
 * Formula:
 * - Base: 10 points
 * - Condition multiplier: POOR (0.5x), FAIR (0.7x), GOOD (1.0x), EXCELLENT (1.5x)
 * - Wishlist bonus: +1 point per 3 wishlist items (max +3)
 * - Rarity bonus: +1 point if only 1 copy exists, +0.5 if 2-3 copies
 * 
 * @param condition - Book condition
 * @param wishlistCount - Number of users who wishlisted this book
 * @param rarityCount - Number of similar books in database
 * @returns Integer between 5-20
 */
function calculateFallbackPoints(
  condition: BookCondition,
  wishlistCount: number,
  rarityCount: number
): number {
  // Base points
  let points = 10

  // Condition multiplier
  const conditionMultipliers: Record<BookCondition, number> = {
    POOR: 0.5,
    FAIR: 0.7,
    GOOD: 1.0,
    EXCELLENT: 1.5,
  }
  points *= conditionMultipliers[condition] || 1.0

  // Wishlist bonus (demand signal)
  // +1 point per 3 wishlist items, max +3
  const wishlistBonus = Math.min(Math.floor(wishlistCount / 3), 3)
  points += wishlistBonus

  // Rarity bonus
  // +1 if unique, +0.5 if rare (2-3 copies)
  if (rarityCount === 1) {
    points += 1
  } else if (rarityCount >= 2 && rarityCount <= 3) {
    points += 0.5
  }

  // Clamp to 5-20 range
  return Math.max(5, Math.min(20, Math.round(points)))
}

/**
 * Validate and clamp AI response
 * 
 * Ensures the AI output is a valid integer between 5-20.
 * This is critical for fairness and preventing manipulation.
 * 
 * @param response - Raw response from Gemini
 * @param fallbackValue - Value to use if response is invalid
 * @returns Validated integer between 5-20
 */
function validateAndClampResponse(
  response: string,
  fallbackValue: number
): number {
  // Extract number from response (handles cases like "15" or "The value is 15")
  const numberMatch = response.match(/\d+/)
  
  if (!numberMatch) {
    console.warn('Gemini response does not contain a number, using fallback')
    return fallbackValue
  }

  const parsedValue = parseInt(numberMatch[0], 10)

  if (isNaN(parsedValue)) {
    console.warn('Failed to parse Gemini response as number, using fallback')
    return fallbackValue
  }

  // Clamp to 5-20 range (critical for fairness)
  const clampedValue = Math.max(5, Math.min(20, parsedValue))
  
  if (clampedValue !== parsedValue) {
    console.warn(
      `Gemini returned value ${parsedValue} outside valid range, clamped to ${clampedValue}`
    )
  }

  return clampedValue
}

/**
 * Calculate book point value using AI (Gemini)
 * 
 * This function:
 * 1. Constructs a structured prompt with valuation signals
 * 2. Calls Gemini API
 * 3. Validates and clamps the response
 * 4. Falls back to heuristic if AI fails
 * 
 * @param condition - Book condition (POOR, FAIR, GOOD, EXCELLENT)
 * @param wishlistCount - Number of users who wishlisted this book
 * @param rarityCount - Number of books with same title+author in database
 * @returns Integer between 5-20
 */
export async function calculateBookPoints(
  condition: BookCondition,
  wishlistCount: number,
  rarityCount: number
): Promise<number> {
  // Calculate fallback value first (used if AI fails)
  const fallbackValue = calculateFallbackPoints(
    condition,
    wishlistCount,
    rarityCount
  )

  // Construct structured prompt for Gemini
  // CRITICAL: Only include the three allowed signals
  // No user-controlled free text to prevent manipulation
  const prompt = `You are an assistant evaluating the value of a physical book in Readloom, a community book exchange system.

Inputs:
- Condition: ${condition}
- Wishlist count: ${wishlistCount}
- Similar books count: ${rarityCount}

Rules:
- Higher condition (EXCELLENT > GOOD > FAIR > POOR) increases value
- Higher wishlist count increases value (indicates demand)
- Higher rarity (lower similar books count) increases value
- Return ONLY a single integer between 5 and 20
- Do not include any explanation, text, or additional characters
- Just return the number`

  try {
    // Call Gemini API
    const response = await callGeminiAPI(prompt)

    // Validate and clamp response
    const points = validateAndClampResponse(response, fallbackValue)

    return points
  } catch (error: any) {
    // If Gemini API fails (rate limit, quota, etc.), use fallback immediately
    // This ensures the system always produces a value without retrying
    // CRITICAL: Don't retry on rate limit errors - use fallback to avoid hitting limits
    const errorMessage = error?.message || ''
    const isRateLimit = 
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('Too Many Requests')
    
    if (isRateLimit) {
      console.warn('Gemini API rate limit hit, using fallback calculation to avoid further API calls')
    } else {
      console.error('Gemini API failed, using fallback calculation:', errorMessage)
    }
    
    // Always return fallback - never retry to avoid hitting API limits
    return fallbackValue
  }
}

