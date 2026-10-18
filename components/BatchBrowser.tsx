'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useDeferredValue } from 'react'
import { ChevronRight, Play, Search } from 'lucide-react'
import { inputCls } from '@/lib/ui'
import { ytThumb } from '@/lib/youtube'
import type { BatchRow } from '@/lib/types'

const PAGE_SIZE = 12

export default function BatchBrowser({ batches }: { batches: BatchRow[] }) {
  const [query, setQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)

  const videos = useMemo(
    () =>
      batches
        .flatMap((b) => b.videos.map((v) => ({ ...v, batchName: b.name })))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [batches]
  )

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((v) => (v.title ?? '').toLowerCase().includes(q))
  }, [videos, deferredQuery])

  const paginated = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount])

  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
  }, [deferredQuery])

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [filtered.length])

  if (!videos.length) {
    return <p className="py-12 text-center text-neutral-400">এই ব্যাচে এখনও কোনো ভিডিও নেই।</p>
  }

  return (
    <>
      <div className="relative mb-6">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-500">
          <Search className="size-4" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ভিডিওর টাইটেল দিয়ে খুঁজুন..."
          className={`${inputCls} pl-10`}
          aria-label="ভিডিওর টাইটেল দিয়ে খুঁজুন"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-neutral-400">কোনো ভিডিও পাওয়া যায়নি।</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {paginated.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-2.5 pr-3"
            >
              <Link href={`/v/${v.slug}`} className="group flex min-w-0 flex-1 items-center gap-3">
                <span className="relative block aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ytThumb(v.youtube_id)} alt="" loading="lazy" className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/10">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold">{v.title?.trim() || `ভিডিও ${i + 1}`}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-neutral-400">
                    {v.batchName} • দেখুন <ChevronRight className="size-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
