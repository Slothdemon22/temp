import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sessionUser = await getCurrentUser()

  if (!sessionUser) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  // Fetch fresh user data from database to get latest points
  const freshUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      points: true,
      isAdmin: true,
    },
  })

  if (!freshUser) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user: freshUser })
}

