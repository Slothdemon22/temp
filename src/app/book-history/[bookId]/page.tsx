/**
 * Public Book History Page
 * 
 * This page is accessible via QR code and shows the book's journey.
 * 
 * Features:
 * - No authentication required (public access)
 * - Timeline view of book's history
 * - Emotional, community-driven design
 * - Shows book's journey through different readers
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBookWithHistoryAction, addHistoryEntryAction } from '@/app/actions/book-history'
import BackButton from '@/components/back-button'

interface BookHistoryEntry {
  id: string
  city: string
  readingDuration: string | null
  notes: string | null
  displayName: string | null
  createdAt: Date | string // Can be Date object or serialized string from server action
}

interface Book {
  id: string
  title: string
  author: string
  description: string | null
  images: string[]
  condition: string
  location: string
  currentOwner: {
    id: string
    name: string | null
  }
  historyEntries: BookHistoryEntry[]
}

export default function BookHistoryPage() {
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const bookId = params.bookId as string

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    city: '',
    readingDuration: '',
    notes: '',
  })

  const isOwner = book && user && book.currentOwner.id === user.id

  const loadBook = useCallback(async () => {
    if (!bookId) {
      setError('Invalid book ID')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await getBookWithHistoryAction(bookId)

      if (!result.success) {
        setError(result.error || 'Book not found')
        setLoading(false)
        return
      }

      if (!result.book) {
        setError('Book not found')
        setLoading(false)
        return
      }

      // Ensure historyEntries is an array
      const bookData = {
        ...result.book,
        historyEntries: result.book.historyEntries || [],
      }

      setBook(bookData)
    } catch (err: any) {
      console.error('Error loading book history:', err)
      setError(err.message || 'An error occurred while loading book history')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (bookId) {
      loadBook()
    }
  }, [bookId, loadBook])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await addHistoryEntryAction(bookId, {
        city: formData.city,
        readingDuration: formData.readingDuration || undefined,
        notes: formData.notes || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Failed to add history entry')
        setSubmitting(false)
        return
      }

      // Reset form and reload
      setFormData({ city: '', readingDuration: '', notes: '' })
      setShowAddForm(false)
      await loadBook()
    } catch (err: any) {
      setError(err.message || 'Failed to add history entry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <p className="text-zinc-500">Loading book history...</p>
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/books"
            className="text-orange-500 hover:text-orange-600 transition-colors"
          >
            Back to Books
          </Link>
        </div>
      </div>
    )
  }

  if (!book) {
    if (error) {
      return (
        <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/books"
              className="text-orange-500 hover:text-orange-600 transition-colors"
            >
              Back to Books
            </Link>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-4xl mx-auto">
        <BackButton href={`/book/${bookId}`} label="Back to Book Details" />
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {/* Header */}
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
                {book.title}
              </h1>
              <p className="text-xl text-zinc-600 mb-6">
                by {book.author}
              </p>
              
              {book.description && (
                <p className="text-zinc-600 mb-4">
                  {book.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span>📍 {book.location}</span>
                <span>📚 {book.historyEntries.length} reader{book.historyEntries.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-lg">
                <img
                  src={`/api/qr-code/${bookId}`}
                  alt={`QR code for ${book.title}`}
                  className="w-64 h-64"
                  width={256}
                  height={256}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center max-w-[200px]">
                Scan to view this book's journey
              </p>
            </div>
          </div>
        </div>

        {/* Add History Entry (Owner Only) */}
        {isOwner && !showAddForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 px-4 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
            >
              ✍️ Add Your Reading Experience
            </button>
          </div>
        )}

        {isOwner && showAddForm && (
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 mb-8">
            <h2 className="text-xl font-urbanist font-bold text-zinc-900 mb-4">
              Share Your Reading Experience
            </h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Where did you read this book?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Reading Duration
                </label>
                <input
                  type="text"
                  value={formData.readingDuration}
                  onChange={(e) => setFormData({ ...formData, readingDuration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="e.g., 2 weeks, 1 month"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Share your thoughts, favorite quotes, or reading experience..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all font-semibold disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  {submitting ? 'Adding...' : 'Add to History'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ city: '', readingDuration: '', notes: '' })
                    setError('')
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-zinc-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 md:p-8">
          <h2 className="text-2xl font-urbanist font-bold text-zinc-900 mb-6">
            📖 This Book's Journey
          </h2>

          {book.historyEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 mb-4">
                This book's journey hasn't started yet.
              </p>
              {isOwner && (
                <p className="text-sm text-zinc-500">
                  Be the first to share your reading experience!
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 to-orange-600"></div>

              {/* Timeline Entries */}
              <div className="space-y-8">
                {book.historyEntries.map((entry, index) => (
                  <div key={entry.id} className="relative pl-12">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-2 w-8 h-8 bg-orange-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>

                    {/* Entry Content */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-urbanist font-semibold text-zinc-900">
                            {entry.displayName || 'Anonymous Reader'}
                          </h3>
                          <p className="text-sm text-zinc-500">
                            📍 {entry.city}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(entry.createdAt as string).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {entry.readingDuration && (
                        <p className="text-sm text-zinc-600 mb-2">
                          ⏱️ Reading duration: {entry.readingDuration}
                        </p>
                      )}

                      {entry.notes && (
                        <p className="text-zinc-700 whitespace-pre-wrap">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

