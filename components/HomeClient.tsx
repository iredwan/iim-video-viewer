'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useDeferredValue } from 'react'
import { ChevronRight, Play, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { inputCls } from '@/lib/ui'
import { ytThumb } from '@/lib/youtube'
import type { PublicVideo } from '@/lib/types'

const PAGE_SIZE = 12

type State = PublicVideo[] | 'error' | null

export default function HomeClient() {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  const [videos, setVideos] = useState<State>(null)
  const [query, setQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [invalid, setInvalid] = useState(false)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setParams(p)

    const cls = Number(p.get('class'))
    const key = p.get('key') ?? ''

    // ক্লাস নাম্বার + পাসওয়ার্ড দুটোই থাকলে তবেই কোয়েরি — নাহলে কোনো API কল নয়
    if (!p.get('class') || !Number.isInteger(cls) || cls < 1 || !key.trim()) {
      setInvalid(true)
      return
    }

    let alive = true
    setVideos(null)
    createClient()
      .rpc('get_public_videos', { p_class: cls, p_key: key.trim() })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setVideos('error')
        else {
          const rows = (data ?? []) as unknown as PublicVideo[]
          // ভুল পাসওয়ার্ড/অসাবধান লিংকে কিছু না ফিরলে সমান মেসেজ
          setVideos(rows)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const list = videos === 'error' || videos === null ? [] : videos
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((v) => (v.title ?? '').toLowerCase().includes(q) || String(v.class_no).includes(q))
  }, [videos, deferredQuery])

  const paginated = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount])

  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
  }, [deferredQuery])

  useEffect(() => {
    if (invalid) return
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [filtered.length, invalid])

  const userKey = useMemo(() => params?.get('key') ?? '', [params])
  const topClass = useMemo(() => Math.max(0, ...(videos && videos !== 'error' ? videos.map((v) => v.class_no) : [0])), [videos])

  if (invalid || !params) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="text-xl font-bold">ক্লাস রেকডিং দেখতে গ্রুপ থেকে লিংকে ক্লিক করুন</div>
      </div>
    )
  }

  if (videos === 'error') {
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

  if (videos === null) {
    return <p className="w-full py-12 text-center text-neutral-400">লোড করছে...</p>
  }

  if (topClass === 0) {
    return (
      <div className="w-full py-12 text-center text-neutral-400">
        লিংকটি সঠিক নয় বা এই ক্লাসটি এখনও প্রকাশিত হয়নি।
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center text-sm text-neutral-400">
        আপনি ক্লাস ১ থেকে <span className="font-semibold text-neutral-200">{topClass}</span> পর্যন্ত দেখতে পাচ্ছেন
      </div>

      <div className="relative mb-6">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-500">
          <Search className="size-4" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ক্লাস নাম্বার বা টাইটেল দিয়ে খুঁজুন..."
          className={`${inputCls} pl-10`}
          aria-label="ক্লাস খুঁজুন"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-neutral-400">কোনো ক্লাস পাওয়া যায়নি।</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {paginated.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-2.5 pr-3"
            >
              <Link
                href={`/v/${v.slug}?key=${encodeURIComponent(userKey)}`}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="relative block aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-xl bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ytThumb(v.youtube_id)} alt="" loading="lazy" className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/10">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">{v.title?.trim() || `ক্লাস ${v.class_no}`}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-neutral-400">
                    ক্লাস {v.class_no} • দেখুন <ChevronRight className="size-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
