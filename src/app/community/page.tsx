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
import EmojiPickerButton from '@/components/EmojiPicker'
import { toast } from 'sonner'

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

  // UI state
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'newest' | 'replies'>('newest')

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

  const toggleReplies = (postId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
    }
    setExpandedReplies(newExpanded)
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'replies') {
      return b._count.replies - a._count.replies
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-5xl mx-auto">
        <BackButton href="/" label="Back to Home" />

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              💬
            </div>
            <div>
              <h1 className="text-4xl font-urbanist font-bold text-zinc-900 mb-1">
                Community Discussions
              </h1>
              <p className="text-zinc-600">
                Share your thoughts, ask questions, recommend books, and connect with fellow readers.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Post Creation Form */}
        {showPostForm && isAuthenticated && (
          <div className="mb-8 p-6 bg-gradient-to-br from-white to-orange-50/30 backdrop-blur-xl border-2 border-orange-200 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                ✍️
              </div>
              <h3 className="text-xl font-bold text-zinc-900">
                Create New Post
              </h3>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="relative">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your thoughts, ask questions, recommend books, or provide reading guidance..."
                  className="w-full p-4 pr-14 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-400 resize-none bg-white shadow-sm"
                  rows={6}
                  required
                />
                <div className="absolute bottom-4 right-4">
                  <EmojiPickerButton
                    onEmojiClick={(emoji) => {
                      setPostContent(postContent + emoji)
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-zinc-600 group-hover:text-zinc-900">
                    Post anonymously
                  </span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostForm(false)
                      setPostContent('')
                      setIsAnonymous(false)
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-zinc-700 rounded-full font-semibold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPost}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingPost ? 'Posting...' : 'Publish Post'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-xl border border-orange-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-urbanist font-bold text-zinc-900">
                All Discussions
              </h2>
              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    sortBy === 'newest'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('replies')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    sortBy === 'replies'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Most Replies
                </button>
              </div>
            </div>
            {isAuthenticated && !showPostForm && (
              <button
                onClick={() => setShowPostForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                <span>New Post</span>
              </button>
            )}
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
                💭
              </div>
              <p className="text-xl font-semibold text-zinc-700 mb-2">
                No discussions yet
              </p>
              <p className="text-zinc-500 mb-6">
                Be the first to start a conversation!
              </p>
              {!isAuthenticated && (
                <button
                  onClick={() => router.push(`/login?callbackUrl=/community`)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
                >
                  Sign in to post
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedPosts.map((post) => (
                <div
                  key={post.id}
                  className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-orange-200 hover:shadow-lg transition-all duration-300"
                >
                  {/* Post Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {post.isAnonymous ? '👤' : getInitials(getDisplayName(post))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <p className="font-bold text-zinc-900 text-lg">
                          {getDisplayName(post)}
                        </p>
                        {post.isAnonymous && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            Anonymous
                          </span>
                        )}
                        {post.book && (
                          <span className="text-xs px-3 py-1 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 rounded-full font-medium border border-orange-200">
                            📚 {post.book.title}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 flex items-center gap-2">
                        <span>{formatDate(post.createdAt)}</span>
                        {post._count.replies > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span>💬</span>
                              <span>{post._count.replies} {post._count.replies === 1 ? 'reply' : 'replies'}</span>
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-5 pl-16">
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed text-base">
                      {post.content}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pl-16">
                    {isAuthenticated && (
                      <button
                        onClick={() =>
                          setReplyingTo(replyingTo === post.id ? null : post.id)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-full font-medium transition-all text-sm"
                      >
                        <span>💬</span>
                        <span>{replyingTo === post.id ? 'Cancel' : 'Reply'}</span>
                      </button>
                    )}
                    {post.replies && post.replies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(post.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-zinc-600 rounded-full font-medium transition-all text-sm"
                      >
                        <span>{expandedReplies.has(post.id) ? '👆' : '👇'}</span>
                        <span>
                          {expandedReplies.has(post.id) ? 'Hide' : 'Show'} {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Reply Form */}
                  {replyingTo === post.id && isAuthenticated && (
                    <div className="mb-4 ml-16 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200 shadow-sm">
                      <form
                        onSubmit={(e) => handleCreateReply(post.id, e)}
                        className="space-y-3"
                      >
                      <div className="relative">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a thoughtful reply..."
                          className="w-full p-3 pr-12 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-300 resize-none bg-white"
                          rows={3}
                          required
                        />
                        <div className="absolute bottom-3 right-3">
                          <EmojiPickerButton
                            onEmojiClick={(emoji) => {
                              setReplyContent(replyContent + emoji)
                            }}
                          />
                        </div>
                      </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replyAnonymous}
                              onChange={(e) => setReplyAnonymous(e.target.checked)}
                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-zinc-600">
                              Reply anonymously
                            </span>
                          </label>
                          <button
                            type="submit"
                            disabled={creatingReply}
                            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {creatingReply ? 'Replying...' : 'Post Reply'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Replies */}
                  {post.replies && post.replies.length > 0 && expandedReplies.has(post.id) && (
                    <div className="mt-4 ml-16 space-y-4 pl-6 border-l-3 border-orange-200">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="py-3 px-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {reply.isAnonymous ? '👤' : getInitials(getDisplayName(reply))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm text-zinc-900">
                                  {getDisplayName(reply)}
                                </p>
                                {reply.isAnonymous && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                    Anonymous
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
                                {formatDate(reply.createdAt)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed pl-11">
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

