# Complete Testing Checklist for Readloom

## Prerequisites

1. ✅ Database migration completed
   ```bash
   npx prisma migrate dev --name add_books_and_wishlist
   ```

2. ✅ Environment variables set
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for image uploads)

3. ✅ Supabase Storage bucket created
   - Bucket name: `techverse`
   - Set to **Public**

4. ✅ Prisma client generated
   ```bash
   npx prisma generate
   ```

## Authentication Testing

### Signup Flow
- [ ] Visit `/signup`
- [ ] Fill in name, email, password
- [ ] Submit form
- [ ] Verify automatic login after signup
- [ ] Verify redirect to home page
- [ ] Try duplicate email (should show error)

### Login Flow
- [ ] Visit `/login`
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify successful login
- [ ] Verify redirect
- [ ] Try invalid credentials (should show error)

### Session & Middleware
- [ ] Try accessing `/add-book` without login (should redirect to login)
- [ ] Try accessing `/profile` without login (should redirect to login)
- [ ] Verify session persists after page refresh
- [ ] Verify logout works correctly

## Book Management Testing

### Add Book (Authenticated)
- [ ] Visit `/add-book` (must be logged in)
- [ ] Fill in all required fields:
  - Title
  - Author
  - Location
  - Condition
- [ ] Test image upload:
  - [ ] Select single image
  - [ ] Verify upload button appears
  - [ ] Click "Upload Images"
  - [ ] Verify image appears in preview
  - [ ] Select multiple images
  - [ ] Upload all images
  - [ ] Verify all images appear in preview
  - [ ] Remove an image from preview
- [ ] Submit form
- [ ] Verify redirect to `/books`
- [ ] Verify book appears in listing

### Image Upload Edge Cases
- [ ] Try uploading non-image file (should fail)
- [ ] Try uploading file > 5MB (should fail)
- [ ] Try uploading without authentication (should fail)
- [ ] Verify error messages are clear

### Browse Books (Public)
- [ ] Visit `/books` (without login)
- [ ] Verify books are displayed
- [ ] Verify images are shown (if uploaded)
- [ ] Test search:
  - [ ] Search by title
  - [ ] Search by author
  - [ ] Verify results update
- [ ] Test filters:
  - [ ] Filter by condition
  - [ ] Filter by location
  - [ ] Combine filters
- [ ] Click on a book card
- [ ] Verify navigation to book detail page

### Book Detail Page
- [ ] Visit `/book/[id]` for an existing book
- [ ] Verify all book information displays:
  - [ ] Title
  - [ ] Author
  - [ ] Description
  - [ ] Condition
  - [ ] Location
  - [ ] Images (if any)
  - [ ] Owner name
  - [ ] Wishlist count
- [ ] Verify "Back to Books" link works

### Book Detail - Authenticated Actions
- [ ] Log in
- [ ] Visit book detail page
- [ ] Test wishlist toggle:
  - [ ] Click "Add to Wishlist"
  - [ ] Verify button changes to "Remove from Wishlist"
  - [ ] Verify wishlist count increases
  - [ ] Click "Remove from Wishlist"
  - [ ] Verify button changes back
  - [ ] Verify wishlist count decreases

### Book Detail - Owner Actions
- [ ] Log in as book owner
- [ ] Visit your book's detail page
- [ ] Verify owner controls appear:
  - [ ] "Mark as Available/Unavailable" button
  - [ ] "Delete Book" button
- [ ] Test availability toggle:
  - [ ] Click toggle
  - [ ] Verify status changes
  - [ ] Verify book disappears from `/books` if marked unavailable
- [ ] Test delete:
  - [ ] Click "Delete Book"
  - [ ] Confirm deletion
  - [ ] Verify redirect to `/books`
  - [ ] Verify book no longer appears

### Access Control
- [ ] Try to modify someone else's book (should fail)
- [ ] Try to delete someone else's book (should fail)
- [ ] Verify error messages are appropriate

## Wishlist Testing

### Add to Wishlist
- [ ] Log in
- [ ] Browse books
- [ ] Click "Add to Wishlist" on a book
- [ ] Verify button state changes
- [ ] Visit book detail page
- [ ] Verify wishlist status is correct

### Remove from Wishlist
- [ ] Remove book from wishlist
- [ ] Verify button state changes
- [ ] Verify wishlist count decreases

### Wishlist as Demand Signal
- [ ] Add multiple books to wishlist
- [ ] Verify wishlist counts display correctly
- [ ] Verify counts update in real-time

## Image Display Testing

### Books Listing Page
- [ ] Verify images display in book cards
- [ ] Verify placeholder shows if no images
- [ ] Verify images are properly sized
- [ ] Verify images load correctly

### Book Detail Page
- [ ] Verify main image displays
- [ ] Verify multiple images show in gallery
- [ ] Verify image aspect ratios are correct
- [ ] Verify images are clickable/zoomable (if implemented)

## Error Handling Testing

### Invalid Book ID
- [ ] Visit `/book/invalid-id`
- [ ] Verify error message displays
- [ ] Verify "Back to Books" link works

### Network Errors
- [ ] Disconnect network
- [ ] Try to add book
- [ ] Verify error message displays
- [ ] Reconnect network
- [ ] Verify recovery works

### Form Validation
- [ ] Try submitting empty form
- [ ] Verify validation errors
- [ ] Try invalid data
- [ ] Verify appropriate error messages

## Performance Testing

- [ ] Verify page load times are reasonable
- [ ] Verify images load efficiently
- [ ] Verify search/filter is responsive
- [ ] Verify no unnecessary API calls

## Security Testing

- [ ] Verify service role key is not exposed in client code
- [ ] Verify authentication is required for protected routes
- [ ] Verify ownership checks work correctly
- [ ] Verify file upload validation works
- [ ] Verify SQL injection protection (Prisma handles this)

## Cross-Browser Testing

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in mobile browsers

## Complete User Flow

1. [ ] Sign up for new account
2. [ ] Log in
3. [ ] Add a book with images
4. [ ] Browse books
5. [ ] View book detail
6. [ ] Add book to wishlist
7. [ ] Search for books
8. [ ] Filter books
9. [ ] Update book availability
10. [ ] Delete a book
11. [ ] Log out
12. [ ] Browse as guest
13. [ ] Try to add book (should redirect to login)

## Known Issues / Notes

- Images uploaded with `bookId=temp` remain in `temp/` folder (can be cleaned up later)
- Image deletion when book is deleted is not yet implemented
- Image compression before upload is not yet implemented

