/**
 * Book Detail Page
 * 
 * Public page for viewing individual book details.
 * Shows:
 * - Book information
 * - Current owner
 * - Wishlist count (demand signal)
 * - Wishlist toggle for authenticated users
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBookByIdAction } from '@/app/actions/books'
import {
  addToWishlistAction,
  removeFromWishlistAction,
  isInWishlistAction,
} from '@/app/actions/wishlist'
import { updateBookAvailabilityAction, deleteBookAction } from '@/app/actions/books'
import { requestExchangeAction } from '@/app/actions/exchanges'
import { getBookPointsAction } from '@/app/actions/book-points'
import { getReadingGuideAction } from '@/app/actions/reading-guide'
import { generateBookHistoryUrl } from '@/lib/qr-code'
import type { BookCondition } from '@/lib/books'
import AskBookModal from '@/components/AskBookModal'
import { toast } from 'sonner'
import BuyPointsModal from '@/components/BuyPointsModal'
import BackButton from '@/components/back-button'
import ForumSection from '@/components/ForumSection'
import BookChat from '@/components/BookChat'
import { hasBooksToGiveAway } from '@/app/actions/points'
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues with Leaflet
const BookLocationMap = dynamic(() => import('@/components/BookLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
})

const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'POOR', label: 'Poor - Significant wear' },
  { value: 'FAIR', label: 'Fair - Noticeable wear' },
  { value: 'GOOD', label: 'Good - Minor wear' },
  { value: 'EXCELLENT', label: 'Excellent - Like new' },
]

interface Book {
  id: string
  title: string
  author: string
  description: string | null
  condition: BookCondition
  images: string[]
  location: string
  chapters: string[]
  isAvailable: boolean
  computedPoints: number | null
  createdAt: Date
  currentOwner: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    wishlistItems: number
  }
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const bookId = params.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inWishlist, setInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [updatingAvailability, setUpdatingAvailability] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [requestingExchange, setRequestingExchange] = useState(false)
  const [userPoints, setUserPoints] = useState<number | null>(null)
  const [bookPoints, setBookPoints] = useState<number | null>(null)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [askBookModalOpen, setAskBookModalOpen] = useState(false)
  const [buyPointsModalOpen, setBuyPointsModalOpen] = useState(false)
  const [hasBooks, setHasBooks] = useState<boolean | null>(null)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [exchangePoints, setExchangePoints] = useState<any[]>([])
  const [readingGuide, setReadingGuide] = useState<{
    difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced'
    recommendedReaderType: string
    suggestedReadingPace: string
    tips: string[]
  } | null>(null)
  const [loadingGuide, setLoadingGuide] = useState(false)

  const isOwner = book && user && book.currentOwner.id === user.id
  const bookIdRef = useRef<string | null>(null)
  const bookLoadedRef = useRef(false)

  const loadBookPoints = useCallback(async (bookId: string) => {
    setLoadingPoints(true)
    try {
      const result = await getBookPointsAction(bookId)
      if (result.success && result.points !== undefined) {
        setBookPoints(result.points)
      }
    } catch (err) {
      // Ignore errors, will use fallback
    } finally {
      setLoadingPoints(false)
    }
  }, [])

  const loadReadingGuide = useCallback(async (bookId: string) => {
    setLoadingGuide(true)
    try {
      const result = await getReadingGuideAction(bookId)
      if (result.success && result.guide) {
        setReadingGuide(result.guide)
      }
    } catch (err) {
      // Ignore errors, guide is optional
    } finally {
      setLoadingGuide(false)
    }
  }, [])

  // Load AI-computed points for the book (only when book ID changes)
  useEffect(() => {
    if (book && book.id !== bookIdRef.current) {
      bookIdRef.current = book.id
      loadBookPoints(book.id)
      loadReadingGuide(book.id)
    }
  }, [book?.id, loadBookPoints, loadReadingGuide])

  const requiredPoints = bookPoints || 10 // Fallback to 10 if not yet calculated

  const checkUserBooks = useCallback(async () => {
    if (!user) return
    setLoadingBooks(true)
    try {
      const result = await hasBooksToGiveAway(user.id)
      setHasBooks(result)
    } catch (err) {
      setHasBooks(false)
    } finally {
      setLoadingBooks(false)
    }
  }, [user?.id])

  const loadUserPoints = useCallback(async () => {
    if (!user) return
    // Get user points from session or API
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.user) {
        setUserPoints(data.user.points)
      }
    } catch {
      // Ignore errors
    }
  }, [user?.id])

  const checkWishlistStatus = useCallback(async () => {
    if (!isAuthenticated || !book) return

    try {
      const result = await isInWishlistAction(book.id)
      setInWishlist(result.success ? result.inWishlist : false)
    } catch {
      setInWishlist(false)
    }
  }, [isAuthenticated, book?.id])

  const loadBook = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getBookByIdAction(bookId)

      if (!result.success) {
        setError(result.error || 'Book not found')
        return
      }

      setBook(result.book as any)
      bookLoadedRef.current = true
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (bookId) {
      loadBook()
    }
  }, [bookId, loadBook])

  // Load exchange points
  useEffect(() => {
    const loadExchangePoints = async () => {
      try {
        const response = await fetch('/api/exchange-points')
        const data = await response.json()
        if (response.ok) {
          setExchangePoints(data.exchangePoints || [])
        }
      } catch (error) {
        console.error('Error loading exchange points:', error)
      }
    }
    loadExchangePoints()
  }, [])

  useEffect(() => {
    if (isAuthenticated && book && bookLoadedRef.current) {
      checkWishlistStatus()
      loadUserPoints()
      checkUserBooks()
    }
  }, [isAuthenticated, book?.id, checkWishlistStatus, loadUserPoints, checkUserBooks])

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/book/${bookId}`)
      return
    }

    if (!book) return

    setWishlistLoading(true)
    try {
      if (inWishlist) {
        await removeFromWishlistAction(book.id)
        setInWishlist(false)
      } else {
        await addToWishlistAction(book.id)
        setInWishlist(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update wishlist')
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleToggleAvailability = async () => {
    if (!book) return

    setUpdatingAvailability(true)
    try {
      await updateBookAvailabilityAction(book.id, !book.isAvailable)
      setBook({ ...book, isAvailable: !book.isAvailable })
    } catch (err: any) {
      setError(err.message || 'Failed to update availability')
    } finally {
      setUpdatingAvailability(false)
    }
  }

  const handleDelete = async () => {
    if (!book) return

    // Show confirmation using Sonner toast
    toast(
      'Are you sure you want to delete this book? This action cannot be undone.',
      {
        duration: 5000,
        action: {
          label: 'Delete',
          onClick: async () => {
            toast.promise(
              deleteBookAction(book.id).then(() => {
                router.push('/books')
              }),
              {
                loading: 'Deleting book...',
                success: 'Book deleted successfully',
                error: (err) => err.message || 'Failed to delete book',
              }
            )
          },
        },
      }
    )
  }

  const handleRequestExchange = async () => {
    if (!book) return

    // Show confirmation using Sonner toast
    toast(
      `Request this book for ${requiredPoints} points? Points will be deducted when the owner approves.`,
      {
        duration: 5000,
        action: {
          label: 'Confirm',
          onClick: async () => {
            setRequestingExchange(true)
            setError('')
            
            toast.promise(
              requestExchangeAction(book.id).then(async (result) => {
                if (!result.success) {
                  setError(result.error || 'Failed to request exchange')
                  setRequestingExchange(false)
                  throw new Error(result.error || 'Failed to request exchange')
                }

                // Success - reload book to show updated status
                await loadBook()
                setRequestingExchange(false)
                return result
              }),
              {
                loading: 'Sending exchange request...',
                success: 'Exchange request sent! The owner will be notified.',
                error: (err) => err.message || 'Failed to request exchange',
              }
            )
          },
        },
      }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <p className="text-zinc-500">Loading book...</p>
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

  if (!book) return null

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-5xl mx-auto">
        <BackButton href="/books" label="Back to Books" />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Images */}
            <div>
              {book.images && book.images.length > 0 ? (
                <div className="space-y-4">
                  <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={book.images[0]}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {book.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {book.images.slice(1, 5).map((image, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                        >
                          <img
                            src={image}
                            alt={`${book.title} ${idx + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400 text-6xl">
                    📚
                  </span>
                </div>
              )}

              {/* Location Map - Below book images */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                  📍 Location & Exchange Points
                </h3>
                <BookLocationMap
                  bookLocation={book.location}
                  exchangePoints={exchangePoints}
                  height="300px"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Showing exchange points in {book.location}
                </p>
              </div>
            </div>

            {/* Book Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
                  {book.title}
                </h1>
                <p className="text-xl text-zinc-600 mb-4">
                  by {book.author}
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm font-medium">
                    {
                      BOOK_CONDITIONS.find((c) => c.value === book.condition)
                        ?.label || book.condition
                    }
                  </span>
                  <span className="text-sm text-zinc-500">
                    📍 {book.location}
                  </span>
                  <span className="text-sm text-zinc-500">
                    ❤️ {book._count.wishlistItems} wishlist
                    {book._count.wishlistItems !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${
                      book.isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {book.isAvailable ? '✓ Available' : '✗ Not Available'}
                  </span>
                </div>
              </div>

              {book.description && (
                <div>
                  <h2 className="text-lg font-urbanist font-semibold text-zinc-900 mb-2">
                    Description
                  </h2>
                  <p className="text-zinc-600 whitespace-pre-wrap">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Chapters */}
              {book.chapters && book.chapters.length > 0 && (
                <div>
                  <h2 className="text-lg font-urbanist font-semibold text-zinc-900 mb-3">
                    📚 Chapters ({book.chapters.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {book.chapters.map((chapter, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-semibold text-orange-500 w-8">
                          {index + 1}.
                        </span>
                        <span className="text-sm text-zinc-700 flex-1">
                          {chapter}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading Guide */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-urbanist font-semibold text-zinc-900 mb-4">
                  📖 Reading Guide
                </h2>
                {loadingGuide ? (
                  <div className="text-sm text-zinc-500">
                    Generating reading guide...
                  </div>
                ) : readingGuide ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-700">Difficulty Level:</span>
                      <span
                        className={`px-3 py-1 rounded-md text-sm font-semibold ${
                          readingGuide.difficultyLevel === 'Beginner'
                            ? 'bg-green-100 text-green-700'
                            : readingGuide.difficultyLevel === 'Intermediate'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {readingGuide.difficultyLevel}
                      </span>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-zinc-700 block mb-1">
                        Recommended For:
                      </span>
                      <p className="text-sm text-zinc-600">
                        {readingGuide.recommendedReaderType}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-zinc-700 block mb-1">
                        Suggested Reading Pace:
                      </span>
                      <p className="text-sm text-zinc-600">
                        {readingGuide.suggestedReadingPace}
                      </p>
                    </div>

                    {readingGuide.tips && readingGuide.tips.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-zinc-700 block mb-2">
                          Tips to Understand Better:
                        </span>
                        <ul className="space-y-2">
                          {readingGuide.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-zinc-600 flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">
                    Reading guide unavailable at this time.
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-urbanist font-semibold text-zinc-900 mb-2">
                  Current Owner
                </h2>
                <p className="text-zinc-600">
                  {book.currentOwner.name || 'Anonymous User'}
                </p>
              </div>

              {/* QR Code */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-urbanist font-semibold text-zinc-900 mb-3">
                  📱 Book History QR Code
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Scan this QR code to view this book's journey through different readers
                </p>
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-lg">
                    <img
                      src={`/api/qr-code/${book.id}`}
                      alt={`QR code for ${book.title}`}
                      className="w-64 h-64"
                      width={256}
                      height={256}
                    />
                  </div>
                  <Link
                    href={`/book-history/${book.id}`}
                    className="mt-3 text-sm text-orange-500 hover:text-orange-600 transition-colors font-medium"
                  >
                    View Book History →
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {/* Ask This Book - Available to everyone */}
                <button
                  onClick={() => setAskBookModalOpen(true)}
                  className="w-full py-3 px-4 rounded-full font-semibold bg-linear-to-tl from-purple-600 to-purple-500 text-white hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  🤖 Ask This Book
                </button>

                {isAuthenticated && !isOwner && book.isAvailable && (
                  <div className="space-y-2">
                    <button
                      onClick={handleRequestExchange}
                      disabled={requestingExchange || loadingPoints || (userPoints !== null && userPoints < requiredPoints)}
                      className="w-full py-3 px-4 rounded-full font-semibold bg-linear-to-tl from-green-600 to-green-500 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                    >
                      {requestingExchange
                        ? 'Requesting...'
                        : loadingPoints
                        ? 'Calculating points...'
                        : `📖 Request Exchange (${requiredPoints} points)`}
                    </button>
                    {userPoints !== null && (
                      <p className="text-xs text-zinc-500 text-center">
                        Your points: {userPoints} | Required: {requiredPoints}
                        {loadingPoints && (
                          <span className="block text-orange-500 mt-1">
                            AI calculating value...
                          </span>
                        )}
                        {!loadingPoints && userPoints < requiredPoints && (
                          <span className="block text-red-500 mt-1">
                            Insufficient points
                          </span>
                        )}
                      </p>
                    )}
                    {bookPoints && (
                      <p className="text-xs text-zinc-400 text-center italic">
                        💡 Value calculated using AI based on condition, demand, and rarity
                      </p>
                    )}
                    {/* Show Buy Points button if user doesn't have enough points AND doesn't have books to give away */}
                    {!loadingPoints && !loadingBooks && userPoints !== null && userPoints < requiredPoints && hasBooks === false && (
                      <button
                        onClick={() => setBuyPointsModalOpen(true)}
                        className="w-full py-3 px-4 rounded-full font-semibold bg-linear-to-tl from-blue-600 to-blue-500 text-white hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                      >
                        💳 Buy Points
                      </button>
                    )}
                  </div>
                )}

                {isAuthenticated && (
                  <button
                    onClick={handleWishlistToggle}
                    disabled={wishlistLoading}
                    className={`w-full py-2.5 px-4 rounded-full font-semibold transition-all disabled:opacity-50 ${
                      inWishlist
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                    }`}
                  >
                    {wishlistLoading
                      ? 'Loading...'
                      : inWishlist
                      ? '❤️ Remove from Wishlist'
                      : '🤍 Add to Wishlist'}
                  </button>
                )}

                {isOwner && (
                  <>
                    <button
                      onClick={handleToggleAvailability}
                      disabled={updatingAvailability}
                      className="w-full py-2.5 px-4 rounded-full font-semibold bg-gray-100 text-zinc-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {updatingAvailability
                        ? 'Updating...'
                        : book.isAvailable
                        ? 'Mark as Unavailable'
                        : 'Mark as Available'}
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full py-2.5 px-4 rounded-full font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Book'}
                    </button>
                  </>
                )}

                {!isAuthenticated && (
                  <Link
                    href={`/login?callbackUrl=/book/${bookId}`}
                    className="block w-full py-2.5 px-4 rounded-full font-semibold bg-gray-100 text-zinc-700 hover:bg-gray-200 transition-colors text-center"
                  >
                    Sign in to add to wishlist
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ask This Book Modal */}
      <AskBookModal
        bookId={book.id}
        bookTitle={book.title}
        isOpen={askBookModalOpen}
        onClose={() => setAskBookModalOpen(false)}
      />

      {/* Buy Points Modal */}
      <BuyPointsModal
        isOpen={buyPointsModalOpen}
        onClose={() => setBuyPointsModalOpen(false)}
        requiredPoints={requiredPoints}
        currentPoints={userPoints || 0}
      />

      {/* Community Discussions Forum */}
      <ForumSection bookId={book.id} />

      {/* Book Chat Section */}
      <BookChat bookId={book.id} />
    </div>
  )
}

