# Supabase Realtime Chat Troubleshooting

## Common Issues and Fixes

### 1. **Table Name with Hyphens**
If your table is named `book-room` (with a hyphen), Supabase might have issues. Try:

**Option A: Use quotes in SQL queries** (already done in code)
**Option B: Rename table to use underscores** (`book_room`)

If you rename, update:
- Table name in Supabase Dashboard
- All references in code: `'book-room'` → `'book_room'`

### 2. **Realtime Not Enabled**
1. Go to Supabase Dashboard → Database → Replication
2. Find `book-room` table
3. Toggle ON the replication switch
4. Wait a few seconds for it to activate

### 3. **Row Level Security (RLS) Blocking Access**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS on book-room table
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

### 4. **Check Table Structure**

Verify your table has these exact columns:
- `id` (auto-increment, PRIMARY KEY)
- `book_id` (TEXT)
- `user_id` (TEXT)
- `message` (TEXT)

Run this to check:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'book-room';
```

### 5. **Check Browser Console**

Open browser DevTools (F12) → Console tab and look for:
- `Subscription status: SUBSCRIBED` ✅ (good)
- `Subscription status: CHANNEL_ERROR` ❌ (problem)
- `New message received:` (should appear when messages are sent)

### 6. **Test Realtime Connection**

Add this to your component temporarily to test:

```typescript
useEffect(() => {
  const testChannel = supabase
    .channel('test-channel')
    .subscribe((status) => {
      console.log('Test channel status:', status)
    })
  
  return () => {
    supabase.removeChannel(testChannel)
  }
}, [])
```

### 7. **Verify Environment Variables**

Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 8. **Check Network Tab**

In DevTools → Network tab:
- Look for WebSocket connections to Supabase
- Should see `wss://your-project.supabase.co/realtime/v1/websocket`
- Status should be 101 (Switching Protocols)

## Quick Fix Checklist

- [ ] Realtime enabled on `book-room` table
- [ ] RLS policies allow SELECT and INSERT
- [ ] Table columns match expected structure
- [ ] Environment variables are set
- [ ] Browser console shows "SUBSCRIBED" status
- [ ] WebSocket connection established (check Network tab)

## Still Not Working?

1. Check Supabase Dashboard → Logs for errors
2. Try renaming table to `book_room` (no hyphen)
3. Verify the table exists: `SELECT * FROM "book-room" LIMIT 1;`
4. Test with a simple insert: `INSERT INTO "book-room" (book_id, user_id, message) VALUES ('test', 'test', 'test');`

