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

  // শুধু ইউআরএলে batchId থাকলেই কেবল সুপাবেসে কোয়েরি করা হবে
  if (batchId) {
    const { data, error: err } = await publicClient()
      .from('batches')
      .select('id, name, videos(id, slug, youtube_id, title, created_at)')
      .eq('id', batchId)
      .order('created_at', { ascending: true })
      .maybeSingle()

    error = !!err
    if (data) {
      batches = [data as unknown as BatchRow]
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/assets/logo/logo.png"
          alt="ইক্বরা ইসলামিক আলিম্মদারা"
          width={120}
          height={120}
          className="h-16 w-auto"
        />
        <div>
          <h1 className="text-3xl font-bold">ইক্বরা ইসলামিক মাদরাসা</h1>
          <p className="mt-1 text-2xl font-semibold text-[#0ffac8]">
            সহীহ শুদ্ধভাবে কুরআন শিক্ষা কোর্স -শুধুমাত্র নারীদের জন্য
            <br />
            <span className="mt-1 block text-lg font-semibold text-cyan-400">
              অনলাইন কুরআন শেখার বিশ্বস্ত প্ল্যাটফর্ম
            </span>
          </p>
        </div>
      </div>

      {/* batchId থাকলে BatchBrowser রেন্ডার হবে */}
      {batchId ? (
        <div className="w-full">
          {error ? (
            <p className="py-12 text-center text-neutral-400">ডাটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>
          ) : (
            <Suspense fallback={<div className="py-12 text-center text-neutral-400">লোড করছে...</div>}>
              <BatchBrowser batches={batches} />
            </Suspense>
          )}
        </div>
      ) : (
        /* batchId না থাকলে শুধুমাত্র এই বার্তাটি দেখাবে (কোনো API Call ছাড়াই) */
        <div className="flex flex-1 items-center justify-center text-center">
          <div className="text-xl font-bold">
            ক্লাস রেকডিং দেখতে গ্রুপ থেকে লিংকে ক্লিক করুন
          </div>
        </div>
      )}
    </main>
  )
}