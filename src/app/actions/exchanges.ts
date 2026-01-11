/**
 * Server Actions for Exchange Management
 * 
 * These are Next.js Server Actions for exchange operations.
 * All actions include proper authentication and authorization checks.
 */

'use server'

import { revalidatePath } from 'next/cache'
import {
  requestExchange as requestExchangeLib,
  approveExchange as approveExchangeLib,
  rejectExchange as rejectExchangeLib,
  cancelExchange as cancelExchangeLib,
  disputeExchange as disputeExchangeLib,
  getUserExchanges as getUserExchangesLib,
  getPendingExchangeRequests as getPendingExchangeRequestsLib,
} from '@/lib/exchanges'

/**
 * Server Action: Request an exchange
 */
export async function requestExchangeAction(bookId: string) {
  try {
    const exchange = await requestExchangeLib(bookId)
    revalidatePath('/books')
    revalidatePath(`/book/${bookId}`)
    revalidatePath('/exchanges')
    return { success: true, exchange }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to request exchange' }
  }
}

/**
 * Server Action: Approve an exchange
 * 
 * @param exchangeId - Exchange UUID
 * @param exchangePointId - Optional exchange point ID where exchange takes place
 */
export async function approveExchangeAction(exchangeId: string, exchangePointId?: string) {
  try {
    const exchange = await approveExchangeLib(exchangeId, exchangePointId)
    revalidatePath('/exchanges')
    revalidatePath('/books')
    revalidatePath(`/book/${exchange.book.id}`)
    return { success: true, exchange }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve exchange' }
  }
}

/**
 * Server Action: Reject an exchange
 */
export async function rejectExchangeAction(exchangeId: string) {
  try {
    const exchange = await rejectExchangeLib(exchangeId)
    revalidatePath('/exchanges')
    revalidatePath('/books')
    return { success: true, exchange }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject exchange' }
  }
}

/**
 * Server Action: Cancel an exchange (by requester)
 */
export async function cancelExchangeAction(exchangeId: string) {
  try {
    await cancelExchangeLib(exchangeId)
    revalidatePath('/exchanges')
    revalidatePath('/books')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel exchange' }
  }
}

/**
 * Server Action: Dispute an exchange
 */
export async function disputeExchangeAction(exchangeId: string, reason: string) {
  try {
    const exchange = await disputeExchangeLib(exchangeId, reason)
    revalidatePath('/exchanges')
    return { success: true, exchange }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispute exchange' }
  }
}

/**
 * Server Action: Get user's exchanges
 */
export async function getUserExchangesAction() {
  try {
    const exchanges = await getUserExchangesLib()
    return { success: true, exchanges }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch exchanges' }
  }
}

/**
 * Server Action: Get pending exchange requests
 */
export async function getPendingExchangeRequestsAction() {
  try {
    const exchanges = await getPendingExchangeRequestsLib()
    return { success: true, exchanges }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch pending requests' }
  }
}

