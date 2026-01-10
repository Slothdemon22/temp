'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/components/back-button'
import { Coins, Check, Zap } from 'lucide-react'

const POINTS_OPTIONS = [
  { points: 50, price: 5, label: '50 Points', popular: false },
  { points: 100, price: 10, label: '100 Points', popular: true },
  { points: 200, price: 20, label: '200 Points', popular: false },
  { points: 500, price: 50, label: '500 Points', popular: false },
]

export default function PointsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [userPoints, setUserPoints] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [error, setError] = useState('')

  const loadUserPoints = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.user) {
        setUserPoints(data.user.points || 0)
      }
    } catch (err) {
      console.error('Error loading points:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callbackUrl=/points')
      return
    }

    if (isAuthenticated) {
      loadUserPoints()
    }
  }, [isAuthenticated, authLoading, router, loadUserPoints])

  const handleBuyPoints = async (points: number) => {
    setPurchasing(points)
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
      setPurchasing(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/books" label="Back to Books" />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900">
                Buy Points
              </h1>
              <p className="text-zinc-500 mt-1">
                Purchase points to exchange books
              </p>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-2">Current Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{userPoints ?? 0}</span>
              <span className="text-xl opacity-90">points</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Point Packages */}
        <div className="mb-8">
          <h2 className="text-xl font-urbanist font-bold text-zinc-900 mb-4">
            Choose a Package
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POINTS_OPTIONS.map((option) => {
              const isPurchasing = purchasing === option.points
              return (
                <div
                  key={option.points}
                  className={`relative bg-white border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    option.popular
                      ? 'border-orange-500 shadow-md'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {option.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Coins className="w-6 h-6 text-orange-500" />
                      <h3 className="text-2xl font-bold text-zinc-900">
                        {option.label}
                      </h3>
                    </div>
                    <div className="text-3xl font-bold text-orange-500 mb-1">
                      ${option.price}
                    </div>
                    <p className="text-sm text-zinc-500">
                      ${(option.price / option.points).toFixed(2)} per point
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuyPoints(option.points)}
                    disabled={isPurchasing}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      option.popular
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPurchasing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Processing...
                      </span>
                    ) : (
                      `Buy ${option.label}`
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-urbanist font-bold text-zinc-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            How Points Work
          </h3>
          <div className="space-y-3 text-sm text-zinc-600">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-zinc-900">Pricing:</strong> $1 USD = 10 points
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-zinc-900">Never Expire:</strong> Points remain in your account until you use them
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-zinc-900">Use Anywhere:</strong> Points can be used to request any book on the platform
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-zinc-900">Secure Payment:</strong> All payments are processed securely through Stripe
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-urbanist font-bold text-zinc-900 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-zinc-900 mb-1">
                How are book values calculated?
              </p>
              <p className="text-zinc-600">
                Book values (5-20 points) are calculated using AI based on condition, demand (wishlist count), and rarity.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">
                Can I get a refund?
              </p>
              <p className="text-zinc-600">
                Points purchases are final. However, points never expire and can be used for any book exchange.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">
                What payment methods are accepted?
              </p>
              <p className="text-zinc-600">
                We accept all major credit and debit cards through our secure Stripe payment processor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

