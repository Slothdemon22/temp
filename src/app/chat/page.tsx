'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import ChatPopup from '@/components/ChatPopup'

interface Room {
  id: number
  name: string
  created_at?: string
}

export default function ChatPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/rooms')
      const data = await response.json()
      if (response.ok) {
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchRooms()
    }
  }, [user, fetchRooms])

  const handleChatClick = (room: Room) => {
    setSelectedRoom(room)
    setShowChat(true)
  }

  const handleCloseChat = () => {
    setShowChat(false)
    setSelectedRoom(null)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            Chat Rooms
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Select a room to start chatting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                {room.name}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Room ID: {room.id}
              </p>
              <button
                onClick={() => handleChatClick(room)}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium py-2 px-4 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
              >
                Chat
              </button>
            </div>
          ))}
        </div>

        {rooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No chat rooms available.
            </p>
            <Link
              href="/admin/seed"
              className="inline-block px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Seed Chat Rooms
            </Link>
          </div>
        )}

        {rooms.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/admin/seed"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline"
            >
              Manage / Seed Chat Rooms
            </Link>
          </div>
        )}
      </div>

      {showChat && selectedRoom && (
        <ChatPopup
          room={selectedRoom}
          userName={user.name || user.email}
          onClose={handleCloseChat}
        />
      )}
    </div>
  )
}

