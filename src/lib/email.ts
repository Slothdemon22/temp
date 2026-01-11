/**
 * Email Utility Library
 * 
 * Handles email sending using Resend for:
 * - Welcome emails on signup
 * - Exchange completion notifications
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_SECRET_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@zalnex.me'

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name?: string | null) {
  try {
    const userName = name || 'there'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Readloom!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">📚 Welcome to Readloom!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName},
              </p>
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Welcome to Readloom! We're thrilled to have you join our community of book lovers. 🎉
              </p>
              
              <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #9a3412; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Your Starting Balance:</p>
                <p style="color: #9a3412; font-size: 24px; margin: 0; font-weight: bold;">20 Points</p>
                <p style="color: #9a3412; font-size: 14px; margin: 10px 0 0 0;">Use these points to request books from other members!</p>
              </div>
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Here's what you can do:
              </p>
              
              <ul style="color: #27272a; font-size: 16px; line-height: 1.8; margin: 20px 0; padding-left: 25px;">
                <li>📖 Browse and discover amazing books</li>
                <li>📚 Add books to your collection</li>
                <li>💝 Create a wishlist of books you want</li>
                <li>🔄 Exchange books with other members</li>
                <li>💬 Join community discussions</li>
              </ul>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/books" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Start Browsing Books
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Happy reading!<br>
                The Readloom Team
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} Readloom. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                You're receiving this email because you signed up for Readloom.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Readloom! 📚',
      html,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send exchange completion email to recipient (new owner)
 */
export async function sendExchangeCompletionEmailToRecipient(
  recipientEmail: string,
  recipientName: string | null,
  bookTitle: string,
  bookAuthor: string,
  pointsUsed: number,
  ownerName: string | null,
  exchangePointName?: string | null
) {
  try {
    const userName = recipientName || 'there'
    const ownerDisplayName = ownerName || 'the previous owner'
    const locationInfo = exchangePointName 
      ? `<p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 10px 0;">
           <strong>Exchange Location:</strong> ${exchangePointName}
         </p>`
      : ''
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Exchange Completed!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">✅ Exchange Completed!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName},
              </p>
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your exchange request has been approved by ${ownerDisplayName}. 🎉
              </p>
              
              <div style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #065f46; font-size: 14px; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Book Details</p>
                <p style="color: #065f46; font-size: 20px; margin: 0 0 5px 0; font-weight: bold;">${bookTitle}</p>
                <p style="color: #065f46; font-size: 16px; margin: 0 0 15px 0;">by ${bookAuthor}</p>
                <div style="border-top: 1px solid #86efac; padding-top: 15px; margin-top: 15px;">
                  <p style="color: #065f46; font-size: 14px; margin: 0 0 5px 0;"><strong>Points Used:</strong></p>
                  <p style="color: #065f46; font-size: 18px; margin: 0; font-weight: bold;">${pointsUsed} points</p>
                </div>
              </div>
              
              ${locationInfo}
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                The book is now yours! You can view it in your profile and start reading. 📖
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View My Books
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Happy reading!<br>
                The Readloom Team
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} Readloom. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Exchange Completed: ${bookTitle}`,
      html,
    })

    if (error) {
      console.error('Error sending exchange completion email to recipient:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending exchange completion email to recipient:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send exchange completion email to owner (previous owner)
 */
export async function sendExchangeCompletionEmailToOwner(
  ownerEmail: string,
  ownerName: string | null,
  bookTitle: string,
  bookAuthor: string,
  pointsAwarded: number,
  recipientName: string | null,
  exchangePointName?: string | null
) {
  try {
    const userName = ownerName || 'there'
    const recipientDisplayName = recipientName || 'the new owner'
    const locationInfo = exchangePointName 
      ? `<p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 10px 0;">
           <strong>Exchange Location:</strong> ${exchangePointName}
         </p>`
      : ''
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Exchange Completed!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">✅ Exchange Completed!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName},
              </p>
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your book has been successfully exchanged with ${recipientDisplayName}! 🎉
              </p>
              
              <div style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #065f46; font-size: 14px; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Book Exchanged</p>
                <p style="color: #065f46; font-size: 20px; margin: 0 0 5px 0; font-weight: bold;">${bookTitle}</p>
                <p style="color: #065f46; font-size: 16px; margin: 0 0 15px 0;">by ${bookAuthor}</p>
                <div style="border-top: 1px solid #86efac; padding-top: 15px; margin-top: 15px;">
                  <p style="color: #065f46; font-size: 14px; margin: 0 0 5px 0;"><strong>Points Awarded:</strong></p>
                  <p style="color: #065f46; font-size: 18px; margin: 0; font-weight: bold;">+${pointsAwarded} points</p>
                </div>
              </div>
              
              ${locationInfo}
              
              <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                The points have been added to your account. You can use them to request other books from the community! 📚
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/books" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Browse More Books
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Thank you for sharing your books!<br>
                The Readloom Team
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} Readloom. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `Exchange Completed: ${bookTitle}`,
      html,
    })

    if (error) {
      console.error('Error sending exchange completion email to owner:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending exchange completion email to owner:', error)
    return { success: false, error: error.message }
  }
}

