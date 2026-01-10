/**
 * Reports Page
 * 
 * Shows all reports created by the current user
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/components/back-button'
import { getUserReportsAction } from '@/app/actions/reports'

interface Report {
  id: string
  exchangeId: string
  bookId: string
  reason: string
  description: string | null
  status: string
  createdAt: Date
  book: {
    id: string
    title: string
    author: string
  }
  exchange: {
    id: string
    fromUser: {
      id: string
      name: string | null
    }
    toUser: {
      id: string
      name: string | null
    }
  }
}

const REPORT_REASONS: Record<string, string> = {
  DAMAGED: 'Book was damaged',
  WRONG_BOOK: 'Wrong book received',
  NOT_RECEIVED: 'Book not received',
  POOR_CONDITION: 'Poor condition not as described',
  OTHER: 'Other issue',
}

const REPORT_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callbackUrl=/reports')
      return
    }

    if (isAuthenticated) {
      loadReports()
    }
  }, [isAuthenticated, authLoading, router])

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getUserReportsAction()

      if (!result.success) {
        setError(result.error || 'Failed to load reports')
        return
      }

      setReports((result.reports || []) as Report[])
    } catch (err: any) {
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <p className="text-zinc-500">Loading reports...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/exchanges" />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
            My Reports
          </h1>
          <p className="text-zinc-500">
            View and track all reports you've submitted
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl p-12 max-w-md mx-auto">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg text-zinc-500 mb-4">
                You haven't submitted any reports yet.
              </p>
              <p className="text-sm text-zinc-400 mb-6">
                Reports can be created from completed exchanges.
              </p>
              <Link
                href="/exchanges"
                className="inline-block bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-2.5 px-6 rounded-full hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
              >
                View Exchanges
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/book/${report.bookId}`}
                        className="text-xl font-urbanist font-bold text-zinc-900 hover:text-orange-500 transition-colors"
                      >
                        {report.book.title}
                      </Link>
                      <span className="text-sm text-zinc-500">
                        by {report.book.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600 mb-3">
                      <span>
                        <strong>Exchange:</strong>{' '}
                        {report.exchange.fromUser.name || 'User'} ↔{' '}
                        {report.exchange.toUser.name || 'User'}
                      </span>
                    </div>
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-zinc-700">
                        Reason:
                      </span>
                      <span className="text-sm text-zinc-600 ml-2">
                        {REPORT_REASONS[report.reason] || report.reason}
                      </span>
                    </div>
                    {report.description && (
                      <div className="mb-3">
                        <span className="text-sm font-semibold text-zinc-700">
                          Description:
                        </span>
                        <p className="text-sm text-zinc-600 mt-1">
                          {report.description}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-zinc-500">
                      Submitted on{' '}
                      {new Date(report.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        REPORT_STATUS[report.status]?.color ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {REPORT_STATUS[report.status]?.label || report.status}
                    </span>
                    <Link
                      href={`/exchanges`}
                      className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      View Exchange →
                    </Link>
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

