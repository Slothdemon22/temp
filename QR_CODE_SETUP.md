# QR Code Setup for Production

## Overview

QR codes are generated server-side and link to the book history page at `/book-history/{bookId}`. For production deployments, you need to set the public URL so QR codes work correctly when scanned.

## Environment Variables

### Required for Production

Set the following environment variable in your production environment:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Important:**
- Use `https://` for production
- Do NOT include a trailing slash
- This should be your public-facing domain

### Example Values

```bash
# Production
NEXT_PUBLIC_APP_URL=https://readloom.com

# Staging
NEXT_PUBLIC_APP_URL=https://staging.readloom.com

# Development (optional - will use relative URLs)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How It Works

### URL Priority

The QR code generation uses the following priority:

1. **`NEXT_PUBLIC_APP_URL`** (explicitly set) - **Recommended for production**
2. **`VERCEL_URL`** (if deploying on Vercel) - Automatically detected
3. **Origin header** (fallback for development)

### QR Code URL Format

QR codes always point to:
```
{baseUrl}/book-history/{bookId}
```

Example:
- If `NEXT_PUBLIC_APP_URL=https://readloom.com`
- Book ID: `abc123-def456-ghi789`
- QR code URL: `https://readloom.com/book-history/abc123-def456-ghi789`

## Deployment Platforms

### Vercel

If deploying on Vercel:
1. Set `NEXT_PUBLIC_APP_URL` in your Vercel project settings
2. Or rely on automatic `VERCEL_URL` detection (works automatically)

### Other Platforms

For other platforms (Railway, Render, AWS, etc.):
1. Set `NEXT_PUBLIC_APP_URL` in your environment variables
2. Use your production domain (e.g., `https://your-app.com`)

## Testing

### Local Development

In development, QR codes will use relative URLs if `NEXT_PUBLIC_APP_URL` is not set. This works for testing but QR codes won't work when scanned from a phone.

### Production Testing

1. Deploy with `NEXT_PUBLIC_APP_URL` set
2. Generate a QR code for a book
3. Scan the QR code with your phone
4. Verify it redirects to `https://your-domain.com/book-history/{bookId}`

## Troubleshooting

### QR Code Points to Wrong URL

- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure there's no trailing slash
- Verify the environment variable is available at build time (for Next.js)

### QR Code Uses Relative URL

- This happens when `NEXT_PUBLIC_APP_URL` is not set
- Set the environment variable and redeploy
- QR codes are cached, so you may need to clear cache or wait

### QR Code Not Working After Deployment

- Verify `NEXT_PUBLIC_APP_URL` is set in production environment
- Check that the URL is accessible (no typos)
- Ensure HTTPS is used for production
- Check browser console for any errors

## Notes

- QR codes are **permanent** - once generated, they never change
- QR codes are cached for 1 year (immutable)
- The book history page is **public** (no authentication required)
- Book IDs are UUIDs and never change

