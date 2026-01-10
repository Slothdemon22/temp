'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BuyPointsModalProps {
  isOpen: boolean
  onClose: () => void
  requiredPoints?: number
  currentPoints?: number
}

const POINTS_OPTIONS = [
  { points: 50, price: 5, label: '50 points - $5' },
  { points: 100, price: 10, label: '100 points - $10' },
  { points: 200, price: 20, label: '200 points - $20' },
  { points: 500, price: 50, label: '500 points - $50' },
]

export default function BuyPointsModal({
  isOpen,
  onClose,
  requiredPoints,
  currentPoints = 0,
}: BuyPointsModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null)

  if (!isOpen) return null

  const handleBuyPoints = async (points: number) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/stripe/buy-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const pointsNeeded = requiredPoints && currentPoints
    ? Math.max(0, requiredPoints - currentPoints)
    : null

  // Auto-select option that covers the required points
  const recommendedOption = pointsNeeded
    ? POINTS_OPTIONS.find(opt => opt.points >= pointsNeeded) || POINTS_OPTIONS[0]
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Buy Points</h2>
            <p className="text-sm text-gray-600 mt-1">
              Purchase points to exchange books
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {pointsNeeded && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>You need {pointsNeeded} more points</strong> to request this book.
                {currentPoints > 0 && (
                  <span className="block mt-1">
                    Current balance: {currentPoints} points
                  </span>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Select a package:
            </p>
            {POINTS_OPTIONS.map((option) => {
              const isRecommended = recommendedOption?.points === option.points
              return (
                <button
                  key={option.points}
                  onClick={() => handleBuyPoints(option.points)}
                  disabled={loading}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    isRecommended
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {option.label}
                      </div>
                      {isRecommended && (
                        <span className="text-xs text-orange-600 font-medium">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-orange-600 font-bold">
                      ${option.price}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>Pricing:</strong> $1 = 10 points
              <br />
              Points never expire and can be used for any book exchange.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

