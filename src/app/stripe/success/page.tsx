'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { addPointsAfterPayment } from '@/app/actions/points'
import { useSession } from 'next-auth/react'

function StripeSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const sessionId = searchParams.get('session_id')
  const points = searchParams.get('points')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newPoints, setNewPoints] = useState<number | null>(null)
  const processingRef = useRef<string | null>(null)

  useEffect(() => {
    // Early return if no session ID
    if (!sessionId) {
      setLoading(false)
      return
    }

    // CRITICAL: Check localStorage FIRST (synchronously) before any processing
    const processedSessions = JSON.parse(localStorage.getItem('processed_stripe_sessions') || '[]')
    if (processedSessions.includes(sessionId)) {
      console.log('Session already processed, fetching current points...')
      setLoading(false)
      // Fetch current points to show
      const fetchCurrentPoints = async () => {
        try {
          const response = await fetch('/api/auth/me')
          const data = await response.json()
          if (data.user?.points !== undefined) {
            setNewPoints(data.user.points)
          }
        } catch {
          // Ignore
        }
      }
      fetchCurrentPoints()
      return
    }

    // Prevent duplicate processing - check ref
    if (processingRef.current === sessionId) {
      return
    }

    // Mark as processing immediately (synchronously, before any async operations)
    processingRef.current = sessionId
    // Mark in localStorage IMMEDIATELY before making API call
    processedSessions.push(sessionId)
    localStorage.setItem('processed_stripe_sessions', JSON.stringify(processedSessions))

    const processPayment = async () => {
      // If this is a points purchase, add points to account
      if (points && sessionId) {
        try {
          const result = await addPointsAfterPayment(sessionId)
          if (result.success) {
            setNewPoints(result.points)
            
            // Refresh the session to get updated points
            try {
              await updateSession()
              router.refresh()
            } catch (sessionError) {
              console.warn('Failed to refresh session (non-critical):', sessionError)
            }
          }
        } catch (err: any) {
          console.error('Error processing points:', err)
          setError(err.message || 'Failed to add points. Please contact support.')
          // Remove from processed list if it failed (allow retry)
          const updatedSessions = JSON.parse(localStorage.getItem('processed_stripe_sessions') || '[]')
          const filtered = updatedSessions.filter((id: string) => id !== sessionId)
          localStorage.setItem('processed_stripe_sessions', JSON.stringify(filtered))
          processingRef.current = null
        }
      } else {
        setLoading(false)
      }

      if (points && sessionId) {
        // Loading already handled in try/catch
      } else {
        setLoading(false)
      }
    }

    processPayment()
  }, [sessionId, points]) // Only depend on sessionId and points to prevent re-runs

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">Processing payment...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mt-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            Payment Successful!
          </h1>
          {points && newPoints !== null ? (
            <>
              <p className="text-zinc-600 mb-2">
                {points} points have been added to your account!
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                Your new balance: {newPoints} points
              </p>
            </>
          ) : (
            <p className="text-zinc-600 mb-6">
              Thank you for your purchase.
            </p>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {sessionId && !points && (
            <p className="text-sm text-zinc-500 mb-6">
              Session ID: {sessionId}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              href="/books"
              className="inline-block px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              Browse Books
            </Link>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StripeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mt-4"></div>
          </div>
        </div>
      }
    >
      <StripeSuccessContent />
    </Suspense>
  )
}

