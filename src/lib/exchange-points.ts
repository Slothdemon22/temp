/**
 * Exchange Points Management Utilities
 * 
 * Handles CRUD operations for physical exchange points (stalls)
 * where book exchanges can take place.
 */

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'

export interface CreateExchangePointInput {
  name: string
  description?: string
  address: string
  city: string
  country?: string
  latitude: number
  longitude: number
}

export interface UpdateExchangePointInput {
  name?: string
  description?: string
  address?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  isActive?: boolean
}

/**
 * Get all active exchange points
 * 
 * @returns List of active exchange points
 */
export async function getActiveExchangePoints() {
  return prisma.exchangePoint.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })
}

/**
 * Get all exchange points (admin only)
 * 
 * @returns List of all exchange points
 */
export async function getAllExchangePoints() {
  await requireAdmin()
  
  return prisma.exchangePoint.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Get exchange point by ID
 * 
 * @param id - Exchange point UUID
 * @returns Exchange point or null
 */
export async function getExchangePointById(id: string) {
  return prisma.exchangePoint.findUnique({
    where: { id },
  })
}

/**
 * Create a new exchange point (admin only)
 * 
 * @param data - Exchange point data
 * @returns Created exchange point
 */
export async function createExchangePoint(data: CreateExchangePointInput) {
  await requireAdmin()

  // Validate coordinates
  if (data.latitude < -90 || data.latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90.')
  }
  if (data.longitude < -180 || data.longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180.')
  }

  return prisma.exchangePoint.create({
    data: {
      name: data.name,
      description: data.description,
      address: data.address,
      city: data.city,
      country: data.country || 'Pakistan',
      latitude: data.latitude,
      longitude: data.longitude,
    },
  })
}

/**
 * Update an exchange point (admin only)
 * 
 * @param id - Exchange point UUID
 * @param data - Updated exchange point data
 * @returns Updated exchange point
 */
export async function updateExchangePoint(
  id: string,
  data: UpdateExchangePointInput
) {
  await requireAdmin()

  // Validate coordinates if provided
  if (data.latitude !== undefined) {
    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Invalid latitude. Must be between -90 and 90.')
    }
  }
  if (data.longitude !== undefined) {
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Invalid longitude. Must be between -180 and 180.')
    }
  }

  return prisma.exchangePoint.update({
    where: { id },
    data,
  })
}

/**
 * Delete an exchange point (admin only)
 * 
 * @param id - Exchange point UUID
 */
export async function deleteExchangePoint(id: string) {
  await requireAdmin()

  // Check if exchange point is used in any exchanges
  const exchangeCount = await prisma.exchange.count({
    where: {
      exchangePointId: id,
    },
  })

  if (exchangeCount > 0) {
    // Soft delete: set isActive to false instead of deleting
    return prisma.exchangePoint.update({
      where: { id },
      data: {
        isActive: false,
      },
    })
  }

  // Hard delete if not used
  return prisma.exchangePoint.delete({
    where: { id },
  })
}

