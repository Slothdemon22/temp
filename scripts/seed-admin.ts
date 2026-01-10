/**
 * Seed Admin User Script
 * 
 * Creates an admin user with hardcoded credentials for the hackathon.
 * 
 * HARDCODED ADMIN CREDENTIALS:
 * - Email: admin@booksexchange.com
 * - Password: admin123
 * 
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 * 
 * This script:
 * 1. Checks if admin user already exists
 * 2. Creates admin user if it doesn't exist
 * 3. Sets isAdmin flag to true
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'admin@booksexchange.com'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_NAME = 'Admin User'

async function seedAdmin() {
  console.log('🌱 Seeding admin user...')

  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })

    if (existingAdmin) {
      // Update existing user to ensure isAdmin is true
      if (!existingAdmin.isAdmin) {
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { isAdmin: true },
        })
        console.log('✅ Updated existing user to admin')
      } else {
        console.log('✅ Admin user already exists and is marked as admin')
      }
      return
    }

    // Create new admin user
    const hashedPassword = await hashPassword(ADMIN_PASSWORD)

    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password: hashedPassword,
        points: 1000, // Admin gets high points for testing
        isAdmin: true,
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`   ID: ${admin.id}`)
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedAdmin()
  .then(() => {
    console.log('✨ Admin seeding completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Admin seeding failed:', error)
    process.exit(1)
  })

