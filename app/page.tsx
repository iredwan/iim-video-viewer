import { createClient } from '@supabase/supabase-js'
import Viewer, { type BatchRow } from '@/components/Viewer'

export const revalidate = 30

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data, error } = await supabase
    .from('batches')
    .select('id, name, youtube_id, batch_images(id, url, position)')
    .order('created_at', { ascending: true })

  return (
    <main className="container">
      <h1>ব্যাচ ভিডিও</h1>
      {error ? (
        <p className="empty">ডাটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>
      ) : (
        <Viewer batches={(data ?? []) as BatchRow[]} />
      )}
    </main>
  )
}
