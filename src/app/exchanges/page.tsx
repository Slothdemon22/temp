/**
 * Exchanges Management Page
 * 
 * Shows:
 * - Pending exchange requests (for owners)
 * - User's exchange history
 * - Exchange status and actions
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/components/back-button'
import {
  getPendingExchangeRequestsAction,
  getUserExchangesAction,
  approveExchangeAction,
  rejectExchangeAction,
  cancelExchangeAction,
} from '@/app/actions/exchanges'

interface Exchange {
  id: string
  bookId: string
  fromUserId: string
  toUserId: string
  pointsUsed: number
  status: string
  createdAt: Date
  completedAt: Date | null
  book: {
    id: string
    title: string
    author: string
    condition: string
  }
  fromUser: {
    id: string
    name: string | null
    points?: number
  }
  toUser: {
    id: string
    name: string | null
    points?: number
  }
}

export default function ExchangesPage() {
  const { user, isAuthenticated } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<Exchange[]>([])
  const [userExchanges, setUserExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [pendingResult, historyResult] = await Promise.all([
        getPendingExchangeRequestsAction(),
        getUserExchangesAction(),
      ])

      if (pendingResult.success) {
        setPendingRequests(pendingResult.exchanges || [])
      }

      if (historyResult.success) {
        setUserExchanges(historyResult.exchanges || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exchanges')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (exchangeId: string) => {
    if (!confirm('Approve this exchange? Points will be deducted from the requester and transferred to you.')) {
      return
    }

    setError('')
    try {
      const result = await approveExchangeAction(exchangeId)

      if (!result.success) {
        setError(result.error || 'Failed to approve exchange')
        return
      }

      await loadData()
      alert('Exchange approved! Book ownership has been transferred.')
    } catch (err: any) {
      setError(err.message || 'Failed to approve exchange')
    }
  }

  const handleReject = async (exchangeId: string) => {
    if (!confirm('Reject this exchange request?')) {
      return
    }

    setError('')
    try {
      const result = await rejectExchangeAction(exchangeId)

      if (!result.success) {
        setError(result.error || 'Failed to reject exchange')
        return
      }

      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to reject exchange')
    }
  }

  const handleCancel = async (exchangeId: string) => {
    if (!confirm('Cancel this exchange request?')) {
      return
    }

    setError('')
    try {
      const result = await cancelExchangeAction(exchangeId)

      if (!result.success) {
        setError(result.error || 'Failed to cancel exchange')
        return
      }

      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel exchange')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-700'
      case 'APPROVED':
        return 'bg-blue-100 text-blue-700'
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'REJECTED':
        return 'bg-red-100 text-red-700'
      case 'DISPUTED':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-zinc-700'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="text-center">
          <p className="text-zinc-600 mb-4">
            Please sign in to view your exchanges
          </p>
          <Link
            href="/login"
            className="text-orange-500 hover:text-orange-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/books" />
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
            Exchanges
          </h1>
          <p className="text-zinc-500">
            Manage your book exchanges
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Pending Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Exchange History ({userExchanges.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Loading exchanges...</p>
          </div>
        ) : activeTab === 'pending' ? (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/50 backdrop-blur border border-gray-200 rounded-xl">
                <p className="text-zinc-500">
                  No pending exchange requests
                </p>
              </div>
            ) : (
              pendingRequests.map((exchange) => (
                <div
                  key={exchange.id}
                  className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Link
                        href={`/book/${exchange.bookId}`}
                        className="text-xl font-urbanist font-bold text-zinc-900 hover:text-orange-500 transition-colors"
                      >
                        {exchange.book.title}
                      </Link>
                      <p className="text-zinc-600">
                        by {exchange.book.author}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        Requested by: {exchange.toUser.name || 'Anonymous'}
                      </p>
                      <p className="text-sm text-zinc-500">
                        Points: {exchange.pointsUsed}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(exchange.status)}`}>
                      {exchange.status}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(exchange.id)}
                      className="px-4 py-2 bg-linear-to-tl from-green-600 to-green-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(exchange.id)}
                      className="px-4 py-2 bg-linear-to-tl from-red-600 to-red-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {userExchanges.length === 0 ? (
              <div className="text-center py-12 bg-white/50 backdrop-blur border border-gray-200 rounded-xl">
                <p className="text-zinc-500">
                  No exchange history
                </p>
              </div>
            ) : (
              userExchanges.map((exchange) => {
                const isRequester = exchange.toUserId === user?.id
                const isOwner = exchange.fromUserId === user?.id

                return (
                  <div
                    key={exchange.id}
                    className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link
                          href={`/book/${exchange.bookId}`}
                          className="text-xl font-urbanist font-bold text-zinc-900 hover:text-orange-500 transition-colors"
                        >
                          {exchange.book.title}
                        </Link>
                        <p className="text-zinc-600">
                          by {exchange.book.author}
                        </p>
                        <p className="text-sm text-zinc-500 mt-2">
                          {isRequester
                            ? `You requested from ${exchange.fromUser.name || 'Anonymous'}`
                            : `${exchange.toUser.name || 'Anonymous'} requested from you`}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Points: {exchange.pointsUsed} | {isRequester ? 'Spent' : 'Earned'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {new Date(exchange.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(exchange.status)}`}>
                        {exchange.status}
                      </span>
                    </div>
                    {exchange.status === 'REQUESTED' && isRequester && (
                      <button
                        onClick={() => handleCancel(exchange.id)}
                        className="px-4 py-2 bg-linear-to-tl from-red-600 to-red-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

