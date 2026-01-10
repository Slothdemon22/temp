'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  id: number
  book_id: string
  user_id: string
  name: string
  message: string
}

interface BookChatProps {
  bookId: string
}

export default function BookChat({ bookId }: BookChatProps) {
  const { user, isAuthenticated } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    fetchMessages()

    // Subscribe to real-time updates for this book
    const channel = supabase
      .channel(`book-chat:${bookId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'book-room',
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          console.log('New message received:', payload)
          setMessages((prev) => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setRealtimeStatus(status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to book chat')
          setRealtimeError(null)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error')
          setRealtimeError('Failed to connect to real-time updates. Messages may not appear instantly.')
        } else if (status === 'TIMED_OUT') {
          setRealtimeError('Connection timed out. Check your internet connection.')
        } else if (status === 'CLOSED') {
          setRealtimeError('Connection closed. Trying to reconnect...')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [bookId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/book-chat/messages?bookId=${bookId}`)
      const data = await response.json()
      if (response.ok) {
        setMessages(data.messages || [])
      } else {
        console.error('Error fetching messages:', data.error)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !isAuthenticated) return

    setSending(true)
    try {
      const response = await fetch('/api/book-chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: bookId,
          message: newMessage.trim(),
        }),
      })

      if (response.ok) {
        setNewMessage('')
        // Message will appear via realtime subscription
        // But if realtime fails, we can manually add it
        const data = await response.json()
        if (data.message) {
          // Add message immediately as fallback
          setMessages((prev) => {
            const exists = prev.some(m => m.id === data.message.id)
            if (exists) return prev
            return [...prev, data.message]
          })
        }
      } else {
        const data = await response.json()
        console.error('Failed to send message:', data.error)
        alert(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const [realtimeStatus, setRealtimeStatus] = useState<string>('Connecting...')
  const [realtimeError, setRealtimeError] = useState<string | null>(null)

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-urbanist font-bold text-zinc-900">
          💬 Book Chat
        </h2>
        <div className="flex items-center gap-3">
          {realtimeError && (
            <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
              ⚠️ {realtimeError}
            </div>
          )}
          {realtimeStatus === 'SUBSCRIBED' && (
            <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Messages Container */}
        <div className="h-[550px] overflow-y-auto p-6 space-y-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-sm text-zinc-600">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-zinc-600 font-medium">No messages yet</p>
                <p className="text-sm text-zinc-500 mt-1">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = user && msg.user_id === user.id
              const displayName = msg.name || 'Anonymous'
              const initials = displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || displayName.charAt(0).toUpperCase()
              
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-3 ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isCurrentUser && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
                      {initials}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className={`text-xs font-semibold ${
                        isCurrentUser ? 'text-orange-600' : 'text-zinc-700'
                      }`}>
                        {displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-zinc-400">You</span>
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-md ${
                        isCurrentUser
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm'
                          : 'bg-white border-2 border-gray-200 text-zinc-900 rounded-bl-sm hover:border-gray-300 transition-colors'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
                      {initials}
                    </div>
                  )}
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        {isAuthenticated ? (
          <form onSubmit={handleSendMessage} className="p-5 border-t-2 border-gray-200 bg-gradient-to-r from-white to-gray-50">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-5 py-3.5 pr-14 border-2 border-gray-300 rounded-2xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm hover:shadow-md"
                  disabled={sending}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-orange-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-8 py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white font-bold rounded-2xl hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 text-center">
            <p className="text-sm text-zinc-600">
              <a 
                href={`/login?callbackUrl=/book/${bookId}`} 
                className="text-orange-500 hover:text-orange-600 font-semibold transition-colors inline-flex items-center gap-1"
              >
                Sign in
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              {' '}to join the conversation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

