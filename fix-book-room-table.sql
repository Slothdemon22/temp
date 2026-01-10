-- STEP 1: Check what columns actually exist in your table
-- Run this first in Supabase SQL Editor to see the actual structure

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'book-room'
ORDER BY ordinal_position;

-- STEP 2: If the table doesn't have the 'message' column, add it
-- OR if columns are named differently, we'll need to rename them

-- Option A: If table exists but missing 'message' column
ALTER TABLE "book-room" 
ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';

-- Option B: If you need to recreate the table with correct structure
-- (WARNING: This will delete all existing data!)
/*
DROP TABLE IF EXISTS "book-room";

CREATE TABLE "book-room" (
  id SERIAL PRIMARY KEY,
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_book_room_book_id ON "book-room"(book_id);
CREATE INDEX idx_book_room_user_id ON "book-room"(user_id);
*/

-- STEP 3: Verify the structure is correct
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'book-room'
ORDER BY ordinal_position;

