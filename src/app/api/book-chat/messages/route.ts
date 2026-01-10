import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('book-room')
      .select('*')
      .eq('book_id', bookId)
      .order('id', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createServerClient()
    const body = await request.json()
    const { bookId, message } = body

    if (!bookId || !message || !message.trim()) {
      return NextResponse.json(
        { error: 'bookId and message are required' },
        { status: 400 }
      )
    }

    // Get user's display name (name or email)
    const displayName = user.name || user.email || 'Anonymous'

    console.log('Attempting to insert message:', {
      book_id: bookId,
      user_id: user.id,
      name: displayName,
      message: message.trim().substring(0, 50) + '...'
    })

    const { data, error } = await supabase
      .from('book-room')
      .insert([{ 
        book_id: bookId,
        user_id: user.id,
        name: displayName,
        message: message.trim()
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/book-chat/messages:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

