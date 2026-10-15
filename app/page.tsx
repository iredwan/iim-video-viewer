import Image from 'next/image'
import { Suspense } from 'react'
import BatchBrowser from '@/components/BatchBrowser'
import { publicClient } from '@/lib/supabase/public'
import type { BatchRow } from '@/lib/types'

export const revalidate = 30

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const batchId = params.batch

  let batches: BatchRow[] = []
  let error = false

  const query = publicClient()
    .from('batches')
    .select('id, name, videos(id, slug, youtube_id, title, created_at)')
    .order('created_at', { ascending: true })

  if (batchId) {
    const { data, error: err } = await query.eq('id', batchId).maybeSingle()
    error = !!err
    if (data) {
      batches = [data as unknown as BatchRow]
    }
  } else {
    const { data, error: err } = await query
    error = !!err
    batches = (data ?? []) as unknown as BatchRow[]
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/assets/logo/logo.png"
          alt="ইক্বরা ইসলামিক আলিম্মদারা"
          width={120}
          height={120}
          className="h-16 w-auto"
        />
        <div>
          <h1 className="text-2xl font-bold">ইক্বরা ইসলামিক মাদরাসা</h1>
          <p className="mt-1 text-sm text-neutral-400">সহীহ শুদ্ধভাবে কুরআন শিক্ষা কোর্স
-শুধুমাত্র নারীদের জন্য<br className="text-cyan-400" />অনলাইন কুরআন শেখার বিশ্বস্ত প্ল্যাটফর্ম</p>
        </div>
      </div>
      <div className="text-xl font-bold pb-2.5">ক্লাস রেকডিং</div>
      {error ? (
        <p className="py-12 text-center text-neutral-400">ডাটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>
      ) : (
        <Suspense fallback={<div className="py-12 text-center text-neutral-400">লোড করছে...</div>}>
          <BatchBrowser batches={batches} />
        </Suspense>
      )}
    </main>
  )
}