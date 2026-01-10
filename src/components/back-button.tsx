'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

/**
 * Reusable Back Button Component
 * 
 * If href is provided, uses Link for navigation
 * Otherwise, uses router.back() for browser history
 */
export default function BackButton({ 
  href, 
  label = 'Back',
  className = '' 
}: BackButtonProps) {
  const router = useRouter()

  const baseClasses = "inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors font-medium mb-6"

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        <ArrowLeft className="w-4 h-4" />
        {label}
      </Link>
    )
  }

  return (
    <button
      onClick={() => router.back()}
      className={`${baseClasses} ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}

