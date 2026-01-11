/**
 * Admin Reports Management Page
 * 
 * Admin-only page for viewing and resolving reports.
 * Shows all reports and allows admins to resolve or reject them.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getAllReportsAction,
  resolveReportAction,
  rejectReportAction,
} from '@/app/actions/reports'
import { toast } from 'sonner'

interface Report {
  id: string
  exchangeId: string
  bookId: string
  reporterId: string
  reason: string
  description: string | null
  status: string
  createdAt: Date
  exchange: {
    id: string
    status: string
    pointsUsed: number
    fromUser: {
      id: string
      name: string | null
      email: string
    }
    toUser: {
      id: string
      name: string | null
      email: string
    }
  }
  book: {
    id: string
    title: string
    author: string
    condition: string
  }
  reporter: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminReportsPage() {
  const { user, isAuthenticated } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadReports()
    }
  }, [isAuthenticated])

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAllReportsAction()

      if (!result.success) {
        setError(result.error || 'Failed to load reports')
        return
      }

      setReports(result.reports || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (reportId: string) => {
    if (
      !confirm(
        'Resolve this report? The report will be marked as RESOLVED. The exchange will remain DISPUTED.'
      )
    ) {
      return
    }

    setProcessingId(reportId)
    setError('')

    try {
      const result = await resolveReportAction(reportId)

      if (!result.success) {
        setError(result.error || 'Failed to resolve report')
        return
      }

      await loadReports()
      toast.success('Report resolved successfully!')
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resolve report'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (reportId: string) => {
    if (
      !confirm(
        'Reject this report? The report will be marked as REJECTED. If no other open reports exist, the exchange will be restored to COMPLETED status.'
      )
    ) {
      return
    }

    setProcessingId(reportId)
    setError('')

    try {
      const result = await rejectReportAction(reportId)

      if (!result.success) {
        setError(result.error || 'Failed to reject report')
        return
      }

      await loadReports()
      toast.success('Report rejected successfully!')
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reject report'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700'
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-700'
      case 'RESOLVED':
        return 'bg-green-100 text-green-700'
      case 'REJECTED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-zinc-700'
    }
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      CONDITION_MISMATCH: 'Condition Mismatch',
      DAMAGED_BOOK: 'Damaged Book',
      WRONG_BOOK: 'Wrong Book',
      MISSING_PAGES: 'Missing Pages',
      FAKE_LISTING: 'Fake Listing',
      OTHER: 'Other',
    }
    return labels[reason] || reason
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="text-center">
          <p className="text-zinc-600 mb-4">Please sign in to access admin panel</p>
        </div>
      </div>
    )
  }

  // Filter reports - show OPEN first, then others
  const openReports = reports.filter((r) => r.status === 'OPEN')
  const otherReports = reports.filter((r) => r.status !== 'OPEN')

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
            Reports Management
          </h1>
          <p className="text-zinc-500">
            {reports.length} total report{reports.length !== 1 ? 's' : ''} • {openReports.length} open
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white/50 backdrop-blur border border-gray-200 rounded-xl">
            <p className="text-zinc-500">No reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show OPEN reports first */}
            {openReports.length > 0 && (
              <>
                {openReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onResolve={handleResolve}
                    onReject={handleReject}
                    processingId={processingId}
                    getStatusColor={getStatusColor}
                    getReasonLabel={getReasonLabel}
                  />
                ))}
              </>
            )}

            {/* Show other reports */}
            {otherReports.length > 0 && (
              <>
                {otherReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onResolve={handleResolve}
                    onReject={handleReject}
                    processingId={processingId}
                    getStatusColor={getStatusColor}
                    getReasonLabel={getReasonLabel}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Report Card Component
function ReportCard({
  report,
  onResolve,
  onReject,
  processingId,
  getStatusColor,
  getReasonLabel,
}: {
  report: Report
  onResolve: (id: string) => void
  onReject: (id: string) => void
  processingId: string | null
  getStatusColor: (status: string) => string
  getReasonLabel: (reason: string) => string
}) {
  return (
    <div
      className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-urbanist font-bold text-zinc-900">
              {report.book.title}
            </span>
            <span
              className={`px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(
                report.status
              )}`}
            >
              {report.status}
            </span>
          </div>
          <p className="text-zinc-600 mb-2">by {report.book.author}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-zinc-500 mb-1">Report Reason:</p>
              <p className="text-zinc-900 font-semibold">
                {getReasonLabel(report.reason)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Exchange Status:</p>
              <p className="text-zinc-900 font-semibold">
                {report.exchange.status}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Reporter:</p>
              <p className="text-zinc-900">
                {report.reporter.name || 'Anonymous'} ({report.reporter.email})
              </p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Points:</p>
              <p className="text-zinc-900">{report.exchange.pointsUsed}</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">From User:</p>
              <p className="text-zinc-900">
                {report.exchange.fromUser.name || 'Anonymous'} (
                {report.exchange.fromUser.email})
              </p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">To User:</p>
              <p className="text-zinc-900">
                {report.exchange.toUser.name || 'Anonymous'} (
                {report.exchange.toUser.email})
              </p>
            </div>
          </div>

          {report.description && (
            <div className="mt-4">
              <p className="text-zinc-500 mb-1">Description:</p>
              <p className="text-zinc-900 bg-zinc-50 p-3 rounded-lg">
                {report.description}
              </p>
            </div>
          )}

          <p className="text-xs text-zinc-400 mt-4">
            Reported on: {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {report.status === 'OPEN' && (
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onResolve(report.id)}
            disabled={processingId === report.id}
            className="px-4 py-2 bg-linear-to-tl from-green-600 to-green-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === report.id ? 'Processing...' : 'Resolve'}
          </button>
          <button
            onClick={() => onReject(report.id)}
            disabled={processingId === report.id}
            className="px-4 py-2 bg-linear-to-tl from-red-600 to-red-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === report.id ? 'Processing...' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  )
}

