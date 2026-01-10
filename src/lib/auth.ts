/**
 * Authentication utilities for Readloom
 * 
 * This file provides password hashing and validation utilities.
 * Password hashing uses bcryptjs for security.
 * 
 * Security considerations:
 * - Passwords are hashed with bcrypt (cost factor 10)
 * - Password verification uses constant-time comparison to prevent timing attacks
 * - Password validation enforces minimum security requirements
 */

import bcrypt from 'bcryptjs'

/**
 * Hash a password using bcrypt
 * Cost factor of 10 provides good security/performance balance for hackathon MVP
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  // bcrypt.hash automatically generates a salt and includes it in the hash
  // This prevents rainbow table attacks
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against a hash
 * Uses bcrypt.compare which performs constant-time comparison
 * This prevents timing attacks that could reveal information about the hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Hashed password from database
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validate password strength
 * For hackathon MVP, we enforce basic requirements:
 * - Minimum 6 characters (can be enhanced later)
 * - At least one character (not empty)
 * 
 * @param password - Password to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePassword(password: string): {
  isValid: boolean
  error?: string
} {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters long',
    }
  }

  return { isValid: true }
}

/**
 * Validate email format
 * Basic email validation for hackathon MVP
 * 
 * @param email - Email to validate
 * @returns true if email format is valid
 */
export function validateEmail(email: string): boolean {
  // Basic email regex - can be enhanced with more sophisticated validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

