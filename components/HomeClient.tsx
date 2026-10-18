'use client'

import { useEffect, useState } from 'react'
import BatchBrowser from '@/components/BatchBrowser'
import { createClient } from '@/lib/supabase/client'
import type { BatchRow } from '@/lib/types'

export default function HomeClient() {
  const [batchId, setBatchId] = useState('')
  const [batches, setBatches] = useState<BatchRow[] | 'error' | null>(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('batch') ?? ''
    setBatchId(id)

    // ব্যাচ লিংক না থাকলে কোনো কোয়েরিই হবে না
    if (!id) return

    let alive = true
    setBatches(null)
    createClient()
      .from('batches')
      .select('id, name, videos(id, slug, youtube_id, title, created_at)')
      .eq('id', id)
      .order('created_at', { ascending: true })
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setBatches('error')
        else setBatches(data ? [data as unknown as BatchRow] : [])
      })
    return () => {
      alive = false
    }
  }, [])

  // batchId না থাকলে শুধু এই মেসেজ (কোনো API কল ছাড়াই)
  if (!batchId) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="text-xl font-bold">ক্লাস রেকডিং দেখতে গ্রুপ থেকে লিংকে ক্লিক করুন</div>
      </div>
    )
  }

  if (batches === 'error') {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-neutral-400">ডাটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    )
  }

  if (batches === null) {
    return <p className="w-full py-12 text-center text-neutral-400">লোড করছে...</p>
  }

  return (
    <div className="w-full">
      <BatchBrowser batches={batches} />
    </div>
  )
}
