/**
 * User Profile Page
 * 
 * Shows:
 * - User information (name, email, points)
 * - User's books (owned)
 * - User's wishlist
 * - Exchange history summary
 * 
 * This page is protected by middleware - only authenticated users can access it.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getUserBooksAction } from '@/app/actions/books'
import { getUserWishlistAction } from '@/app/actions/wishlist'
import { getUserExchangesAction } from '@/app/actions/exchanges'
import { signOut } from 'next-auth/react'
import BackButton from '@/components/back-button'
import { User, BookOpen, Heart, ArrowLeftRight, LogOut } from 'lucide-react'

interface Book {
  id: string
  title: string
  author: string
  condition: string
  isAvailable: boolean
  images: string[]
  _count: {
    wishlistItems: number
  }
}

interface WishlistItem {
  id: string
  book: Book
}

interface Exchange {
  id: string
  status: string
  pointsUsed: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'wishlist'>('overview')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callbackUrl=/profile')
    }
  }, [isAuthenticated, authLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [booksResult, wishlistResult, exchangesResult] = await Promise.all([
        getUserBooksAction(),
        getUserWishlistAction(),
        getUserExchangesAction(),
      ])

      if (booksResult.success) {
        setBooks(booksResult.books || [])
      }

      if (wishlistResult.success) {
        setWishlist(wishlistResult.wishlistItems || [])
      }

      if (exchangesResult.success) {
        setExchanges(exchangesResult.exchanges || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, loadData])

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <p className="text-zinc-500">Loading profile...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const completedExchanges = exchanges.filter(e => e.status === 'COMPLETED').length
  const totalPointsEarned = exchanges
    .filter(e => e.status === 'COMPLETED')
    .reduce((sum, e) => sum + e.pointsUsed, 0)

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/books" />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-urbanist font-bold">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-urbanist font-bold text-zinc-900 mb-1">
                  {user.name || 'User'}
                </h1>
                <p className="text-zinc-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-zinc-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-urbanist font-bold text-orange-500 mb-2">
              {user.points || 0}
            </div>
            <div className="text-sm text-zinc-500">Points</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-urbanist font-bold text-orange-500 mb-2">
              {books.length}
            </div>
            <div className="text-sm text-zinc-500">Books Owned</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-urbanist font-bold text-orange-500 mb-2">
              {wishlist.length}
            </div>
            <div className="text-sm text-zinc-500">Wishlist Items</div>
          </div>
          <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-urbanist font-bold text-orange-500 mb-2">
              {completedExchanges}
            </div>
            <div className="text-sm text-zinc-500">Exchanges</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'books'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              My Books ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'wishlist'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Wishlist ({wishlist.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6">
              <h2 className="text-xl font-urbanist font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Account Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-500">Name</p>
                  <p className="text-zinc-900 font-medium">{user.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Email</p>
                  <p className="text-zinc-900 font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Points Balance</p>
                  <p className="text-zinc-900 font-medium text-orange-500">{user.points || 0} points</p>
                </div>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6">
              <h2 className="text-xl font-urbanist font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-orange-500" />
                Exchange Summary
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-500">Total Exchanges</p>
                  <p className="text-zinc-900 font-medium">{completedExchanges}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Total Points Earned</p>
                  <p className="text-zinc-900 font-medium text-orange-500">{totalPointsEarned} points</p>
                </div>
                <Link
                  href="/exchanges"
                  className="inline-block mt-4 text-orange-500 hover:text-orange-600 transition-colors font-medium"
                >
                  View All Exchanges →
                </Link>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6">
              <h2 className="text-xl font-urbanist font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Quick Actions
              </h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/add-book"
                  className="px-4 py-2 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  Add Book
                </Link>
                <Link
                  href="/books"
                  className="px-4 py-2 bg-gray-100 text-zinc-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Browse Books
                </Link>
                <Link
                  href="/exchanges"
                  className="px-4 py-2 bg-gray-100 text-zinc-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  View Exchanges
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div>
            {books.length === 0 ? (
              <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-12 text-center">
                <BookOpen className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">You haven't added any books yet.</p>
                <Link
                  href="/add-book"
                  className="inline-block px-4 py-2 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  Add Your First Book
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book) => (
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
                      <h3 className="text-lg font-urbanist font-bold text-zinc-900 mb-1 line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-zinc-600 mb-2">by {book.author}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-md ${
                          book.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {book.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ❤️ {book._count.wishlistItems}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            {wishlist.length === 0 ? (
              <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-12 text-center">
                <Heart className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">Your wishlist is empty.</p>
                <Link
                  href="/books"
                  className="inline-block px-4 py-2 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                >
                  Browse Books
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => (
                  <Link
                    key={item.id}
                    href={`/book/${item.book.id}`}
                    className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-shadow"
                  >
                    {item.book.images && item.book.images.length > 0 && (
                      <div className="aspect-[3/4] bg-gray-100">
                        <img
                          src={item.book.images[0]}
                          alt={item.book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-urbanist font-bold text-zinc-900 mb-1 line-clamp-1">
                        {item.book.title}
                      </h3>
                      <p className="text-sm text-zinc-600 mb-2">by {item.book.author}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-md ${
                          item.book.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.book.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        <span className="text-xs text-orange-500">
                          ❤️ {item.book._count.wishlistItems}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

