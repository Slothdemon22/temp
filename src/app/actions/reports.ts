/**
 * Server Actions for Report Management
 * 
 * These are Next.js Server Actions for report operations.
 * All actions include proper authentication and authorization checks.
 */

'use server'

import { revalidatePath } from 'next/cache'
import {
  createReport as createReportLib,
  getReportById as getReportByIdLib,
  getReportsByExchange as getReportsByExchangeLib,
  getUserReports as getUserReportsLib,
  canUserReportExchange as canUserReportExchangeLib,
  type ReportReason,
} from '@/lib/reports'

/**
 * Server Action: Create a report
 */
export async function createReportAction(
  exchangeId: string,
  reason: ReportReason,
  description?: string | null
) {
  try {
    const report = await createReportLib(exchangeId, reason, description)
    // Revalidate pages that show exchanges and reports
    revalidatePath('/exchanges')
    revalidatePath(`/exchanges/${exchangeId}`)
    return { success: true, report }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create report' }
  }
}

/**
 * Server Action: Get a report by ID
 */
export async function getReportByIdAction(reportId: string) {
  try {
    const report = await getReportByIdLib(reportId)
    return { success: true, report }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch report' }
  }
}

/**
 * Server Action: Get reports for an exchange
 */
export async function getReportsByExchangeAction(exchangeId: string) {
  try {
    const reports = await getReportsByExchangeLib(exchangeId)
    return { success: true, reports }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch reports',
    }
  }
}

/**
 * Server Action: Get user's reports
 */
export async function getUserReportsAction() {
  try {
    const reports = await getUserReportsLib()
    return { success: true, reports }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch your reports',
    }
  }
}

/**
 * Server Action: Check if user can report an exchange
 */
export async function canUserReportExchangeAction(exchangeId: string) {
  try {
    const result = await canUserReportExchangeLib(exchangeId)
    return { success: true, ...result }
  } catch (error: any) {
    return {
      success: false,
      canReport: false,
      reason: error.message || 'Unable to check report eligibility',
    }
  }
}

