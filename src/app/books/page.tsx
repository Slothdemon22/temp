/**
 * Books Browsing Page - Readloom
 * 
 * Public page for browsing and discovering books.
 * - Unauthenticated users can browse
 * - Authenticated users can also add to wishlist
 * - Search and filter functionality
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBooksAction } from '@/app/actions/books'
import { addToWishlistAction, removeFromWishlistAction, isInWishlistAction } from '@/app/actions/wishlist'
import type { BookCondition } from '@/lib/books'

const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'POOR', label: 'Poor' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EXCELLENT', label: 'Excellent' },
]

interface Book {
  id: string
  title: string
  author: string
  description: string | null
  condition: BookCondition
  images: string[]
  location: string
  isAvailable: boolean
  createdAt: Date
  currentOwner: {
    id: string
    name: string | null
  }
  _count: {
    wishlistItems: number
  }
}

export default function BooksPage() {
  const { user, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    condition: '' as BookCondition | '',
    location: '',
  })

  const [wishlistStatus, setWishlistStatus] = useState<Record<string, boolean>>({})

  // Load books
  useEffect(() => {
    loadBooks()
  }, [filters])

  // Load wishlist status for authenticated users
  useEffect(() => {
    if (isAuthenticated && books.length > 0) {
      loadWishlistStatus()
    }
  }, [isAuthenticated, books])

  const loadBooks = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getBooksAction({
        search: filters.search || undefined,
        condition: filters.condition || undefined,
        location: filters.location || undefined,
        availableOnly: true,
      })

      if (!result.success) {
        setError(result.error || 'Failed to load books')
        return
      }

      setBooks(result.books || [])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadWishlistStatus = async () => {
    if (!isAuthenticated) return

    const status: Record<string, boolean> = {}
    for (const book of books) {
      try {
        const result = await isInWishlistAction(book.id)
        status[book.id] = result.success ? result.inWishlist : false
      } catch {
        status[book.id] = false
      }
    }
    setWishlistStatus(status)
  }

  const handleWishlistToggle = async (bookId: string) => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/login?callbackUrl=/books'
      return
    }

    const isInWishlist = wishlistStatus[bookId]

    try {
      if (isInWishlist) {
        await removeFromWishlistAction(bookId)
        setWishlistStatus({ ...wishlistStatus, [bookId]: false })
      } else {
        await addToWishlistAction(bookId)
        setWishlistStatus({ ...wishlistStatus, [bookId]: true })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update wishlist')
    }
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-urbanist font-bold text-zinc-900 mb-4">
            Discover Your Next Read
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            Explore thousands of books waiting to find new readers. Join our community and start your reading journey today.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl md:text-3xl font-urbanist font-bold text-orange-500">
              {books.length}
            </div>
            <div className="text-sm text-zinc-500 mt-1">Books Available</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl md:text-3xl font-urbanist font-bold text-orange-500">
              {books.filter(b => b._count.wishlistItems > 0).length}
            </div>
            <div className="text-sm text-zinc-500 mt-1">Popular Books</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl md:text-3xl font-urbanist font-bold text-orange-500">
              {new Set(books.map(b => b.location)).size}
            </div>
            <div className="text-sm text-zinc-500 mt-1">Locations</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl md:text-3xl font-urbanist font-bold text-orange-500">
              {books.reduce((sum, b) => sum + b._count.wishlistItems, 0)}
            </div>
            <div className="text-sm text-zinc-500 mt-1">Total Wishlists</div>
          </div>
        </div>

        {/* Header with Add Book Button */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-urbanist font-bold text-zinc-900 mb-2">
              Browse Books
            </h2>
            <p className="text-zinc-500">
              Filter and discover books available for exchange
            </p>
          </div>
          {isAuthenticated && (
            <Link
              href="/add-book"
              className="bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-2.5 px-6 rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
            >
              Add Book
            </Link>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilters({ ...filters, condition: '' })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.condition === ''
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
            }`}
          >
            All Conditions
          </button>
          {BOOK_CONDITIONS.map((condition) => (
            <button
              key={condition.value}
              onClick={() => setFilters({ ...filters, condition: condition.value })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.condition === condition.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
              }`}
            >
              {condition.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                placeholder="Title or author..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Condition
              </label>
              <select
                value={filters.condition}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    condition: e.target.value as BookCondition | '',
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                <option value="">All Conditions</option>
                {BOOK_CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                placeholder="City or region..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Featured/Popular Books Section */}
        {!loading && books.length > 0 && books.some(b => b._count.wishlistItems > 0) && (
          <div className="mb-12">
            <h3 className="text-2xl font-urbanist font-bold text-zinc-900 mb-6">
              Popular Books
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {books
                .filter(b => b._count.wishlistItems > 0)
                .sort((a, b) => b._count.wishlistItems - a._count.wishlistItems)
                .slice(0, 4)
                .map((book) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-shadow"
                  >
                    {book.images && book.images.length > 0 && (
                      <div className="aspect-[3/4] bg-gray-100">
                        <img
                          src={book.images[0]}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h4 className="text-sm font-urbanist font-bold text-zinc-900 mb-1 line-clamp-1">
                        {book.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mb-2">by {book.author}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-500 font-medium">
                          ❤️ {book._count.wishlistItems} wishlist{book._count.wishlistItems !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* All Books Section */}
        <div className="mb-6">
          <h3 className="text-2xl font-urbanist font-bold text-zinc-900 mb-6">
            All Books
          </h3>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Loading books...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-12 max-w-md mx-auto">
              <p className="text-lg text-zinc-500 mb-4">
                No books found. Be the first to add one!
              </p>
              {isAuthenticated ? (
                <Link
                  href="/add-book"
                  className="inline-block bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-2.5 px-6 rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  Add First Book
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-block bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-2.5 px-6 rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  Join to Add Books
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-shadow"
              >
                {book.images && book.images.length > 0 && (
                  <div className="aspect-[3/4] bg-gray-100">
                    <img
                      src={book.images[0]}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <Link href={`/book/${book.id}`}>
                    <h3 className="text-xl font-urbanist font-bold text-zinc-900 mb-2 hover:text-orange-500 transition-colors">
                      {book.title}
                    </h3>
                  </Link>
                  <p className="text-zinc-600 mb-2">
                    by {book.author}
                  </p>
                  {book.description && (
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                      {book.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-md">
                      {BOOK_CONDITIONS.find((c) => c.value === book.condition)
                        ?.label || book.condition}
                    </span>
                    <span className="text-xs text-zinc-500">
                      📍 {book.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {book._count.wishlistItems} wishlist
                      {book._count.wishlistItems !== 1 ? 's' : ''}
                    </span>
                    {isAuthenticated && (
                      <button
                        onClick={() => handleWishlistToggle(book.id)}
                        className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                          wishlistStatus[book.id]
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                        }`}
                      >
                        {wishlistStatus[book.id] ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

