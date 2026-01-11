/**
 * Books Browsing Page - Readloom
 * 
 * Public page for browsing and discovering books.
 * - Unauthenticated users can browse
 * - Authenticated users can also add to wishlist
 * - Search and filter functionality
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBooksAction } from '@/app/actions/books'
import { addToWishlistAction, removeFromWishlistAction, isInWishlistAction } from '@/app/actions/wishlist'
import type { BookCondition } from '@/lib/books'
import { toast } from 'sonner'

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
  const booksIdsRef = useRef<string>('')

  // Load books when filters change
  useEffect(() => {
    loadBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.condition, filters.location])

  // Load wishlist status for authenticated users (only when book IDs actually change)
  useEffect(() => {
    if (!isAuthenticated || books.length === 0) {
      return
    }

    // Create a string of book IDs to compare
    const currentBookIds = books.map(b => b.id).sort().join(',')
    
    // Only load if the book IDs have actually changed
    if (currentBookIds !== booksIdsRef.current) {
      booksIdsRef.current = currentBookIds
      loadWishlistStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, books])

  const loadBooks = async () => {
    booksIdsRef.current = '' // Reset when loading new books
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
    const book = books.find(b => b.id === bookId)

    try {
      if (isInWishlist) {
        toast.promise(
          removeFromWishlistAction(bookId),
          {
            loading: 'Removing from wishlist...',
            success: `${book?.title || 'Book'} removed from wishlist`,
            error: 'Failed to remove from wishlist',
          }
        )
        setWishlistStatus({ ...wishlistStatus, [bookId]: false })
      } else {
        toast.promise(
          addToWishlistAction(bookId),
          {
            loading: 'Adding to wishlist...',
            success: `${book?.title || 'Book'} added to wishlist! ❤️`,
            error: 'Failed to add to wishlist',
          }
        )
        setWishlistStatus({ ...wishlistStatus, [bookId]: true })
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update wishlist'
      setError(errorMessage)
      toast.error(errorMessage)
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-urbanist font-bold text-zinc-900 mb-2">
                  🔥 Popular Books
                </h3>
                <p className="text-zinc-500">
                  Most wishlisted books in our community
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5 md:gap-6">
              {books
                .filter(b => b._count.wishlistItems > 0)
                .sort((a, b) => b._count.wishlistItems - a._count.wishlistItems)
                .slice(0, 8)
                .map((book, index) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    className="group bg-white border border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
                  >
                    {index === 0 && (
                      <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <span>🔥</span>
                        <span>#1</span>
                      </div>
                    )}
                    {book.images && book.images.length > 0 ? (
                      <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
                        <img
                          src={book.images[0]}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {book.isAvailable && (
                          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                            Available
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center group-hover:from-orange-100 group-hover:to-orange-200 transition-colors relative">
                        <span className="text-6xl text-orange-300 group-hover:scale-110 transition-transform">📚</span>
                        {book.isAvailable && (
                          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                            Available
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-grow">
                      <h4 className="text-base font-urbanist font-bold text-zinc-900 mb-2 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors min-h-[3rem]">
                        {book.title}
                      </h4>
                      <p className="text-sm text-zinc-500 mb-3 line-clamp-1">by {book.author}</p>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs px-3 py-1 bg-orange-50 text-orange-600 rounded-lg font-medium">
                          {BOOK_CONDITIONS.find((c) => c.value === book.condition)?.label || book.condition}
                        </span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <span>📍</span>
                          <span className="truncate max-w-[100px]">{book.location.split(',')[0]}</span>
                        </span>
                      </div>
                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-orange-500 text-base">❤️</span>
                          <span className="text-sm font-semibold text-orange-600">
                            {book._count.wishlistItems}
                          </span>
                          {book._count.wishlistItems > 0 && (
                            <span className="text-xs text-zinc-400">wishlist{book._count.wishlistItems !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* All Books Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-urbanist font-bold text-zinc-900 mb-2">
                📚 All Books
              </h3>
              <p className="text-zinc-500">
                Browse all available books for exchange
              </p>
            </div>
            <div className="text-sm text-zinc-500">
              {books.length} {books.length === 1 ? 'book' : 'books'} available
            </div>
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5 md:gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="group bg-white border border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {book.images && book.images.length > 0 ? (
                  <Link href={`/book/${book.id}`} className="block aspect-[3/4] bg-gray-100 overflow-hidden relative">
                    <img
                      src={book.images[0]}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {book.isAvailable && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                        Available
                      </div>
                    )}
                  </Link>
                ) : (
                  <Link href={`/book/${book.id}`} className="block aspect-[3/4] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center group-hover:from-orange-100 group-hover:to-orange-200 transition-colors relative">
                    <span className="text-6xl text-orange-300 group-hover:scale-110 transition-transform">📚</span>
                    {book.isAvailable && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                        Available
                      </div>
                    )}
                  </Link>
                )}
                <div className="p-5 flex flex-col flex-grow">
                  <Link href={`/book/${book.id}`} className="block mb-2">
                    <h3 className="text-base font-urbanist font-bold text-zinc-900 line-clamp-2 hover:text-orange-600 transition-colors leading-tight min-h-[3rem]">
                      {book.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-1">
                    by {book.author}
                  </p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs px-3 py-1 bg-orange-50 text-orange-600 rounded-lg font-medium whitespace-nowrap">
                      {BOOK_CONDITIONS.find((c) => c.value === book.condition)
                        ?.label || book.condition}
                    </span>
                    <span className="text-xs text-zinc-400 line-clamp-1 flex items-center gap-1">
                      <span>📍</span>
                      <span className="truncate max-w-[100px]">{book.location.split(',')[0]}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-orange-500 text-base">❤️</span>
                      <span className="text-sm font-semibold text-zinc-700">
                        {book._count.wishlistItems}
                      </span>
                      {book._count.wishlistItems > 0 && (
                        <span className="text-xs text-zinc-400">wishlist{book._count.wishlistItems !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {isAuthenticated && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleWishlistToggle(book.id)
                        }}
                        className={`text-base px-3 py-1.5 rounded-lg transition-all ${
                          wishlistStatus[book.id]
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-zinc-600 hover:bg-gray-200'
                        }`}
                        title={wishlistStatus[book.id] ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {wishlistStatus[book.id] ? '❤️' : '🤍'}
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

