# Book Chat Table Information

## Table Name
**`book-room`** (with hyphen)

## Column Names and Types

| Column Name | Data Type | Description | Required |
|------------|-----------|-------------|----------|
| `id` | SERIAL (auto-increment) | Primary key, auto-increments | Yes |
| `book_id` | TEXT | The book UUID this message belongs to | Yes |
| `user_id` | TEXT | The user UUID who sent the message | Yes |
| `message` | TEXT | The message content | Yes |

## SQL to Create Table

```sql
CREATE TABLE IF NOT EXISTS "book-room" (
  id SERIAL PRIMARY KEY,
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_book_room_book_id ON "book-room"(book_id);
CREATE INDEX IF NOT EXISTS idx_book_room_user_id ON "book-room"(user_id);
```

## Important Notes

1. **Table name uses hyphen**: `book-room` (not `book_room`)
2. **All text fields**: `book_id`, `user_id`, and `message` are all TEXT type
3. **Auto-increment ID**: The `id` field automatically increments
4. **No timestamps**: If you want timestamps, you'd need to add `created_at` column

## To Add Timestamps (Optional)

If you want to track when messages were created:

```sql
ALTER TABLE "book-room" 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Enable Realtime

1. Go to Supabase Dashboard → Database → Replication
2. Find `book-room` table
3. Toggle ON replication

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE "book-room" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Allow public read on book-room"
ON "book-room" FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY "Allow authenticated insert on book-room"
ON "book-room" FOR INSERT
TO authenticated
WITH CHECK (true);
```

