'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import Image from 'next/image'

/**
 * Login Page for Readloom
 * 
 * Uses NextAuth's signIn function for authentication.
 * Supports redirect to callbackUrl after successful login.
 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use NextAuth's signIn function
      // This handles the authentication flow and session creation
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // Handle redirect manually to show errors
      })

      if (result?.error) {
        // Generic error message to prevent user enumeration
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      if (result?.ok) {
        // Successful login - redirect to callback URL or home
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/hero-gradient-bg.png')] bg-cover bg-center bg-no-repeat px-4 md:px-16 lg:px-24 xl:px-32 py-8 md:py-12">
      <div className="w-full max-w-md my-auto">
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 md:p-10">
          <div className="mb-6 text-center">
            <Link href="/" className="inline-block mb-4">
              <Image src="/assets/readloom.svg" alt="Readloom Logo" width={150} height={40} />
            </Link>
            <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
              Welcome back
            </h1>
            <p className="text-sm md:text-base text-zinc-500">
              Sign in to continue your reading journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-3 px-8 rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

