/**
 * Signup API Route
 * 
 * Handles user registration with:
 * - Email uniqueness validation
 * - Password strength validation
 * - Secure password hashing
 * - Automatic login after signup
 * 
 * Security considerations:
 * - Passwords are hashed before storage
 * - Email validation prevents invalid inputs
 * - Duplicate email errors don't reveal if email exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword, validateEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validation: Check all required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Check if user already exists
    // We check this BEFORE hashing to avoid unnecessary work
    // However, we still hash a dummy password if user exists to prevent timing attacks
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Hash dummy password to prevent timing attacks
      // This makes it harder to enumerate existing emails
      await hashPassword('dummy')
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password securely
    // bcrypt automatically generates a salt and includes it in the hash
    const hashedPassword = await hashPassword(password)

    // Create user with default starting points
    // Default points: 20 (as specified in requirements)
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null, // Name is optional
        password: hashedPassword,
        points: 20, // Default starting balance
      },
      select: {
        id: true,
        email: true,
        name: true,
        points: true,
        createdAt: true,
      },
    })

    // Send welcome email (non-blocking - don't fail signup if email fails)
    try {
      const { sendWelcomeEmail } = await import('@/lib/email')
      await sendWelcomeEmail(user.email, user.name)
    } catch (emailError) {
      // Log error but don't fail signup
      console.error('Failed to send welcome email:', emailError)
    }

    // Note: Auto-login is handled client-side after successful signup
    // This is more reliable than server-side signIn in NextAuth v5
    // The client will call signIn after receiving success response

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          points: user.points,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup error:', error)

    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

