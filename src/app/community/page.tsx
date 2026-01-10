/**
 * General Community Page
 * 
 * A space where all users can post forums and collaborate with each other.
 * Not tied to any specific book - general discussions, book recommendations,
 * reading tips, and community engagement.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/components/back-button'

interface ForumUser {
  id: string
  name: string | null
  email: string
}

interface ForumBook {
  id: string
  title: string
  author: string
}

interface ForumReply {
  id: string
  content: string
  isAnonymous: boolean
  createdAt: string
  user: ForumUser | null
}

interface ForumPost {
  id: string
  content: string
  isAnonymous: boolean
  createdAt: string
  user: ForumUser | null
  book: ForumBook | null
  replies: ForumReply[]
  _count: {
    replies: number
  }
}

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const [posts, setPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Post creation state
  const [showPostForm, setShowPostForm] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [creatingPost, setCreatingPost] = useState(false)

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyAnonymous, setReplyAnonymous] = useState(false)
  const [creatingReply, setCreatingReply] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/forum/posts')
      const data = await response.json()

      if (data.success) {
        setPosts(data.posts || [])
      } else {
        setError(data.error || 'Failed to load discussions')
      }
    } catch (err: any) {
      setError('Failed to load discussions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load forum posts (general community - no bookId)
  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/community`)
      return
    }

    if (!postContent.trim()) {
      setError('Please enter some content')
      return
    }

    setCreatingPost(true)
    setError('')

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: postContent.trim(),
          isAnonymous,
          // No bookId - this is a general community post
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPostContent('')
        setIsAnonymous(false)
        setShowPostForm(false)
        await loadPosts() // Reload posts
      } else {
        setError(data.error || 'Failed to create post')
      }
    } catch (err: any) {
      setError('Failed to create post')
    } finally {
      setCreatingPost(false)
    }
  }

  const handleCreateReply = async (postId: string, e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/community`)
      return
    }

    if (!replyContent.trim()) {
      setError('Please enter some content')
      return
    }

    setCreatingReply(true)
    setError('')

    try {
      const response = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: replyContent.trim(),
          isAnonymous: replyAnonymous,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReplyContent('')
        setReplyAnonymous(false)
        setReplyingTo(null)
        await loadPosts() // Reload posts
      } else {
        setError(data.error || 'Failed to create reply')
      }
    } catch (err: any) {
      setError('Failed to create reply')
    } finally {
      setCreatingReply(false)
    }
  }

  // Format display name (respects anonymity)
  const getDisplayName = (post: ForumPost | ForumReply): string => {
    if (post.isAnonymous) {
      return 'Anonymous Reader'
    }
    if (post.user?.name) {
      return post.user.name
    }
    if (post.user?.email) {
      return post.user.email.split('@')[0]
    }
    return 'Anonymous Reader'
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4 md:px-16 lg:px-24 xl:px-32">
        <p className="text-zinc-500">Loading community discussions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-5xl mx-auto">
        <BackButton href="/" label="Back to Home" />

        <div className="mb-8">
          <h1 className="text-4xl font-urbanist font-bold text-zinc-900 mb-3">
            💬 Community Discussions
          </h1>
          <p className="text-zinc-600">
            Share your thoughts, ask questions, recommend books, and connect with fellow readers.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Post Creation Form */}
        {showPostForm && isAuthenticated && (
          <div className="mb-8 p-6 bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
            <h3 className="text-lg font-semibold text-zinc-900 mb-3">
              Create New Post
            </h3>
            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share your thoughts, ask questions, recommend books, or provide reading guidance..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={5}
                required
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-zinc-600">
                    Post anonymously
                  </span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingPost}
                  className="px-4 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {creatingPost ? 'Posting...' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostForm(false)
                    setPostContent('')
                    setIsAnonymous(false)
                  }}
                  className="px-4 py-2 bg-gray-200 text-zinc-700 rounded-full font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-urbanist font-bold text-zinc-900">
              All Discussions
            </h2>
            {isAuthenticated && !showPostForm && (
              <button
                onClick={() => setShowPostForm(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors"
              >
                + New Post
              </button>
            )}
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 mb-4">
                No discussions yet. Be the first to start a conversation!
              </p>
              {!isAuthenticated && (
                <button
                  onClick={() => router.push(`/login?callbackUrl=/community`)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors"
                >
                  Sign in to post
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-white rounded-lg border border-gray-200"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-zinc-900">
                          {getDisplayName(post)}
                        </p>
                        {post.book && (
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                            📚 {post.book.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-zinc-700 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Reply Button */}
                  {isAuthenticated && (
                    <button
                      onClick={() =>
                        setReplyingTo(replyingTo === post.id ? null : post.id)
                      }
                      className="text-sm text-orange-500 hover:text-orange-600 font-medium mb-3"
                    >
                      {replyingTo === post.id ? 'Cancel' : 'Reply'}
                    </button>
                  )}

                  {/* Reply Form */}
                  {replyingTo === post.id && isAuthenticated && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <form
                        onSubmit={(e) => handleCreateReply(post.id, e)}
                        className="space-y-2"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          rows={3}
                          required
                        />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replyAnonymous}
                              onChange={(e) => setReplyAnonymous(e.target.checked)}
                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="text-xs text-zinc-600">
                              Reply anonymously
                            </span>
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingReply}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          {creatingReply ? 'Replying...' : 'Reply'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Replies */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="py-2">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-sm text-zinc-900">
                              {getDisplayName(reply)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(reply.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sign in prompt for non-authenticated users */}
          {!isAuthenticated && posts.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push(`/login?callbackUrl=/community`)}
                className="px-4 py-2 bg-gray-100 text-zinc-700 rounded-full font-semibold hover:bg-gray-200 transition-colors"
              >
                Sign in to join the discussion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

