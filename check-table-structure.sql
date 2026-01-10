-- Run this in Supabase SQL Editor to check your table structure

-- Check if table exists and see all columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'book-room'
ORDER BY ordinal_position;

-- Alternative: Check all tables with similar names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%book%' OR table_name LIKE '%room%';

-- See actual data structure (if any data exists)
SELECT * FROM "book-room" LIMIT 1;

