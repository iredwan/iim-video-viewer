import { createClient } from '@supabase/supabase-js'

// লগইন ছাড়া পাবলিক পড়ার জন্য (RLS-এ সবাই select করতে পারে)
export function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
}
