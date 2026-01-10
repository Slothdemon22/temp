/**
 * Google Gemini API Integration
 * Uses the official @google/generative-ai SDK
 * Compatible with Google AI Studio API keys
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Hardcoded working model name - gemini-2.5-flash works with AI Studio API keys
const GEMINI_MODEL = 'gemini-2.5-flash'

export async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt cannot be empty')
  }

  try {
    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    // Generate content
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text || !text.trim()) {
      throw new Error('Empty response from Gemini API')
    }

    return text.trim()
  } catch (error: any) {
    // Log the error for debugging
    console.error('[Gemini API] Error:', error)

    const errorMessage = error?.message || 'Unknown error'
    const errorString = JSON.stringify(error).toLowerCase()

    // Check for quota/rate limit errors FIRST (before model checks)
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('Too Many Requests') ||
      errorString.includes('quota') ||
      errorString.includes('rate limit')
    ) {
      throw new Error(
        'Gemini API quota exceeded. You have reached your API usage limit. ' +
        'Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits. ' +
        'To monitor your usage, visit https://ai.dev/rate-limit'
      )
    }

    // Check for leaked API key errors (specific error message from Google)
    if (
      errorMessage.includes('reported as leaked') ||
      errorMessage.includes('leaked')
    ) {
      throw new Error(
        'Your Gemini API key was reported as leaked and has been revoked. ' +
        'Please generate a new API key at https://ai.google.dev/ and add it to your .env file as GEMINI_API_KEY. ' +
        'Never commit API keys to version control!'
      )
    }

    // Check for other API key errors
    if (
      errorMessage.includes('API key') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden')
    ) {
      throw new Error('Invalid or missing GEMINI_API_KEY. Please check your API key.')
    }

    // Check for model not found errors (but NOT if it's in a URL path)
    if (
      (errorMessage.includes('not found') || errorMessage.includes('404')) &&
      !errorMessage.includes('models/') && // Don't match if it's just in the URL
      errorMessage.toLowerCase().includes('model')
    ) {
      throw new Error(
        `Gemini model "${GEMINI_MODEL}" is not available. ` +
        `Please check that the model name is correct. Error: ${errorMessage}`
      )
    }

    // Check for safety filter errors
    if (
      errorMessage.includes('SAFETY') ||
      errorMessage.includes('safety') ||
      errorMessage.includes('blocked')
    ) {
      throw new Error('Response blocked by safety filters')
    }

    // Throw the original error message
    throw new Error(`Gemini API error: ${errorMessage}`)
  }
}
