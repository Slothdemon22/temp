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

    // Handle specific error types
    if (error?.message?.includes('API key')) {
      throw new Error('Invalid or missing GEMINI_API_KEY')
    }

    if (error?.message?.includes('model') || error?.message?.includes('not found')) {
      throw new Error(
        `Gemini model "${GEMINI_MODEL}" is not available. ` +
        `Please check that the model name is correct. Error: ${error.message}`
      )
    }

    if (error?.message?.includes('SAFETY') || error?.message?.includes('safety')) {
      throw new Error('Response blocked by safety filters')
    }

    // Throw the original error message
    throw new Error(`Gemini API error: ${error?.message || 'Unknown error'}`)
  }
}
