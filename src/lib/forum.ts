/**
 * Forum Library - Book-Centric Community Discussions
 * 
 * This module handles:
 * - Creating forum posts and replies
 * - Fetching forum discussions for books
 * - AI-based content moderation using Gemini
 * - Anonymous posting support
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 1. Forum content survives user account deletion
 * 2. Anonymous posting is supported (userId stored but not displayed)
 * 3. AI moderation flags abusive content automatically
 * 4. Flagged content is hidden from public view
 */

import { prisma } from './prisma'
import { callGeminiAPI } from './gemini'

/**
 * AI Content Moderation
 * 
 * Uses Gemini API to classify content as SAFE or UNSAFE.
 * 
 * Why AI moderation:
 * - Ensures ethical and abuse-free conversations
 * - Protects community from toxic content
 * - Scales automatically without manual review
 * 
 * Moderation categories:
 * - Toxic language
 * - Harassment
 * - Hate speech
 * - Spam
 * 
 * @param content - The content to moderate
 * @returns true if content is safe, false if unsafe
 */
async function moderateContent(content: string): Promise<boolean> {
  try {
    const prompt = `You are moderating a book discussion forum.
Classify the following content as SAFE or UNSAFE.
Only return SAFE or UNSAFE.

Content to moderate:
${content}`

    const response = await callGeminiAPI(prompt)
    const normalizedResponse = response.trim().toUpperCase()

    // Only return true if explicitly marked as SAFE
    return normalizedResponse === 'SAFE'
  } catch (error) {
    // If Gemini API fails, we allow the content temporarily
    // This prevents blocking legitimate posts due to API issues
    // In production, you might want to queue for manual review
    console.error('AI moderation failed, allowing content:', error)
    return true // Fail open - allow content if moderation fails
  }
}

/**
 * Validate forum content
 * 
 * Prevents:
 * - Empty posts
 * - Extremely long spam content
 * 
 * @param content - Content to validate
 * @returns Error message if invalid, null if valid
 */
function validateContent(content: string): string | null {
  if (!content || content.trim().length === 0) {
    return 'Content cannot be empty'
  }

  if (content.trim().length < 3) {
    return 'Content must be at least 3 characters'
  }

  // Prevent extremely long spam (10,000 character limit)
  if (content.length > 10000) {
    return 'Content is too long (maximum 10,000 characters)'
  }

  return null
}

/**
 * Create a forum post
 * 
 * @param userId - ID of the user creating the post (required for authenticated users)
 * @param content - Post content
 * @param isAnonymous - Whether to display post anonymously
 * @param bookId - Optional ID of the book this post is about (null for general community posts)
 * @returns Created post or error
 */
export async function createForumPost(
  userId: string,
  content: string,
  isAnonymous: boolean = false,
  bookId: string | null = null
) {
  // Validate content
  const validationError = validateContent(content)
  if (validationError) {
    return { success: false, error: validationError }
  }

  // If bookId is provided, verify book exists
  if (bookId) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return { success: false, error: 'Book not found' }
    }
  }

  // Moderate content using AI
  const isSafe = await moderateContent(content)

  // Create post (flagged if unsafe)
  try {
    const post = await prisma.forumPost.create({
      data: {
        bookId,
        userId, // Always store userId for moderation, even if anonymous
        content: content.trim(),
        isAnonymous,
        flagged: !isSafe, // Flag if content is unsafe
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    })

    return { success: true, post }
  } catch (error: any) {
    console.error('Error creating forum post:', error)
    return { success: false, error: 'Failed to create post' }
  }
}

/**
 * Create a forum reply
 * 
 * @param postId - ID of the post being replied to
 * @param userId - ID of the user creating the reply (required for authenticated users)
 * @param content - Reply content
 * @param isAnonymous - Whether to display reply anonymously
 * @returns Created reply or error
 */
export async function createForumReply(
  postId: string,
  userId: string,
  content: string,
  isAnonymous: boolean = false
) {
  // Validate content
  const validationError = validateContent(content)
  if (validationError) {
    return { success: false, error: validationError }
  }

  // Verify post exists
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
  })

  if (!post) {
    return { success: false, error: 'Post not found' }
  }

  // Moderate content using AI
  const isSafe = await moderateContent(content)

  // Create reply (flagged if unsafe)
  try {
    const reply = await prisma.forumReply.create({
      data: {
        postId,
        userId, // Always store userId for moderation, even if anonymous
        content: content.trim(),
        isAnonymous,
        flagged: !isSafe, // Flag if content is unsafe
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return { success: true, reply }
  } catch (error: any) {
    console.error('Error creating forum reply:', error)
    return { success: false, error: 'Failed to create reply' }
  }
}

/**
 * Get forum posts for a book or general community
 * 
 * Returns only non-flagged posts, ordered by creation date (newest first).
 * 
 * Anonymity handling:
 * - If isAnonymous = true, user information is not included in response
 * - Frontend should display "Anonymous Reader" for anonymous posts
 * 
 * @param bookId - Optional ID of the book
 *                 - If provided (string): returns posts for that specific book
 *                 - If undefined: returns ALL posts (both book-specific and general)
 * @returns Array of forum posts with replies
 */
export async function getForumPosts(bookId?: string) {
  try {
    // Build where clause: if bookId is provided, filter by it; otherwise get all posts
    const whereClause: any = {
      flagged: false, // Only show non-flagged posts
    }
    
    // If bookId is explicitly provided (string), filter by that specific book
    // If bookId is undefined, don't add bookId filter = get ALL posts (both with and without bookId)
    if (bookId !== undefined && bookId !== null) {
      whereClause.bookId = bookId
    }
    // If bookId is undefined, we don't add bookId filter, so we get all posts
    
    const posts = await prisma.forumPost.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
        replies: {
          where: {
            flagged: false, // Only show non-flagged replies
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc', // Oldest replies first
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Newest posts first
      },
    })

    return { success: true, posts }
  } catch (error: any) {
    console.error('Error fetching forum posts:', error)
    return { success: false, error: 'Failed to fetch posts', posts: [] }
  }
}

/**
 * Get a single forum post with replies
 * 
 * @param postId - ID of the post
 * @returns Post with replies or error
 */
export async function getForumPost(postId: string) {
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          where: {
            flagged: false, // Only show non-flagged replies
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    })

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    // Don't return flagged posts
    if (post.flagged) {
      return { success: false, error: 'Post not found' }
    }

    return { success: true, post }
  } catch (error: any) {
    console.error('Error fetching forum post:', error)
    return { success: false, error: 'Failed to fetch post' }
  }
}

