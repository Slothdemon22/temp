/**
 * Report Issue Modal Component
 * 
 * Allows users to report issues with exchanged books.
 * 
 * Features:
 * - Dropdown for report reason
 * - Optional description text area
 * - Validation and error handling
 * - Loading states
 * - Success feedback
 * 
 * Design:
 * - Modal overlay
 * - Clean form UI
 * - Clear instructions
 */

'use client'

import { useState, useEffect } from 'react'
import { createReportAction } from '@/app/actions/reports'

type ReportReason =
  | 'CONDITION_MISMATCH'
  | 'DAMAGED_BOOK'
  | 'WRONG_BOOK'
  | 'MISSING_PAGES'
  | 'FAKE_LISTING'
  | 'OTHER'

interface ReportIssueModalProps {
  exchangeId: string
  bookTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'CONDITION_MISMATCH', label: 'Condition Mismatch' },
  { value: 'DAMAGED_BOOK', label: 'Damaged Book' },
  { value: 'WRONG_BOOK', label: 'Wrong Book / Different Edition' },
  { value: 'MISSING_PAGES', label: 'Missing Pages' },
  { value: 'FAKE_LISTING', label: 'Fake or Misleading Listing' },
  { value: 'OTHER', label: 'Other Issue' },
]

const MAX_DESCRIPTION_LENGTH = 1000

export default function ReportIssueModal({
  exchangeId,
  bookTitle,
  isOpen,
  onClose,
  onSuccess,
}: ReportIssueModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setDescription('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!reason) {
      setError('Please select a reason for reporting')
      return
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await createReportAction(
        exchangeId,
        reason as ReportReason,
        description.trim() || null
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create report')
      }

      // Success
      setSuccess(true)

      // Close modal after a short delay
      setTimeout(() => {
        onClose()
        if (onSuccess) {
          onSuccess()
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Report Issue</h2>
            <p className="text-sm text-zinc-600 mt-1">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                Report Submitted
              </h3>
              <p className="text-sm text-zinc-600">
                Your report has been submitted successfully. The exchange has
                been marked as disputed and will be reviewed.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm text-zinc-600 mb-4">
                  Please select the reason for reporting this exchange. This
                  will help us resolve the issue quickly.
                </p>

                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Reason dropdown */}
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Reason for Report <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Select a reason...</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description textarea */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional details about the issue..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  disabled={loading}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                </p>
              </div>

              {/* Info box */}
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> When you submit a report, the
                  exchange will be marked as disputed. Points will be frozen
                  until the issue is resolved by an administrator.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason}
                  className="flex-1 px-4 py-2 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-all font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

