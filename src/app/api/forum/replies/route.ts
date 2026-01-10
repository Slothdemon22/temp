/**
 * API Route: Forum Replies
 * 
 * Handles:
 * - POST: Create a reply to a forum post (requires authentication)
 * 
 * Security:
 * - Requires authentication (only logged-in users can reply)
 * - AI moderation automatically flags abusive content
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createForumReply } from '@/lib/forum'

/**
 * POST /api/forum/replies
 * 
 * Create a new reply to a forum post.
 * Requires authentication.
 * 
 * Body:
 * - postId: string (required)
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
    const { postId, content, isAnonymous } = body

    // Validate input
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    // Create reply
    const result = await createForumReply(
      postId,
      session.user.id,
      content,
      isAnonymous === true
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create reply' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
    })
  } catch (error: any) {
    console.error('Error in POST /api/forum/replies:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}

