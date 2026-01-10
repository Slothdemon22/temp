/**
 * API Route: Forum Posts
 * 
 * Handles:
 * - GET: Fetch forum posts for a book (public, no auth required)
 * - POST: Create a new forum post (requires authentication)
 * 
 * Security:
 * - GET: Public access (anyone can view discussions)
 * - POST: Requires authentication (only logged-in users can post)
 * - AI moderation automatically flags abusive content
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  createForumPost,
  getForumPosts,
} from '@/lib/forum'

/**
 * GET /api/forum/posts?bookId=...
 * 
 * Fetch all forum posts for a book.
 * Public endpoint - no authentication required.
 * 
 * Returns only non-flagged posts.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')

    // If bookId is provided, use it; otherwise undefined means get ALL posts
    const postBookId = bookId && bookId !== 'null' && bookId !== '' ? bookId : undefined

    const result = await getForumPosts(postBookId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      posts: result.posts || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/forum/posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/forum/posts
 * 
 * Create a new forum post.
 * Requires authentication.
 * 
 * Body:
 * - bookId: string (required)
 * - content: string (required)
 * - isAnonymous: boolean (optional, default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookId, content, isAnonymous } = body

    // Validate input
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    // bookId is optional (null for general community posts)
    const postBookId = bookId && typeof bookId === 'string' ? bookId : null

    // Create post
    const result = await createForumPost(
      session.user.id,
      content,
      isAnonymous === true,
      postBookId
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create post' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      post: result.post,
    })
  } catch (error: any) {
    console.error('Error in POST /api/forum/posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}

