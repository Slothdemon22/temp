/**
 * Ask This Book Modal Component
 * 
 * A chat interface for asking questions about a specific book.
 * 
 * Features:
 * - Simple chat UI
 * - Stateless (no message persistence)
 * - Message limit (5-10 messages per session)
 * - Loading states
 * - Error handling
 * 
 * Design:
 * - Modal overlay
 * - Scrollable message area
 * - Input at bottom
 * - Clean, modern UI
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AskBookModalProps {
  bookId: string
  bookTitle: string
  isOpen: boolean
  onClose: () => void
}

const MAX_MESSAGES = 10

export default function AskBookModal({
  bookId,
  bookTitle,
  isOpen,
  onClose,
}: AskBookModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([])
      setInput('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate input
    const trimmedInput = input.trim()
    if (!trimmedInput) {
      return
    }

    // Check message limit
    if (messages.length >= MAX_MESSAGES) {
      setError(
        `You've reached the maximum of ${MAX_MESSAGES} messages. Please start a new session.`
      )
      return
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      // Call API
      const response = await fetch('/api/ask-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          question: trimmedInput,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get AI response. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Ask This Book</h2>
            <p className="text-sm text-gray-600 mt-1">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-2">Ask me anything about this book!</p>
              <p className="text-sm">
                I can help with themes, reading guidance, interpretations, and
                more.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Ask a question about this book..."
              className="flex-1 border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={loading || messages.length >= MAX_MESSAGES}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || messages.length >= MAX_MESSAGES}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          {messages.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {messages.length}/{MAX_MESSAGES} messages
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

