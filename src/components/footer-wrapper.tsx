'use client'

import { usePathname } from 'next/navigation'
import Footer from './footer'

export default function FooterWrapper() {
  const pathname = usePathname()
  
  // Only show footer on home page
  if (pathname !== '/') {
    return null
  }
  
  return <Footer />
}

