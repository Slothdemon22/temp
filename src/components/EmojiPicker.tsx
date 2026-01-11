/**
 * Emoji Picker Component
 * 
 * A wrapper around emoji-picker-react for consistent styling
 * and integration with the website theme.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Smile } from 'lucide-react'
import type { Theme } from 'emoji-picker-react'

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
)

interface EmojiPickerButtonProps {
  onEmojiClick: (emoji: string) => void
  className?: string
}

export default function EmojiPickerButton({ onEmojiClick, className = '' }: EmojiPickerButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    onEmojiClick(emojiData.emoji)
    // Don't close picker automatically - let user pick multiple emojis
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
        aria-label="Add emoji"
      >
        <Smile className="w-5 h-5 text-zinc-600" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={'light' as Theme}
              width={350}
              height={400}
            />
          </div>
        </div>
      )}
    </div>
  )
}

