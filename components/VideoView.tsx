'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, X } from 'lucide-react'
import YouTubePlayer from './YouTubePlayer'
import ImageCard from './ImageCard'
import { btnGhost } from '@/lib/ui'
import type { ImageRow } from '@/lib/types'

type Props = {
  youtubeId: string
  title: string | null
  classNo: number
  maxUnlocked: number
  userKey: string
  images: ImageRow[]
}

export default function VideoView({ youtubeId, title, classNo, maxUnlocked, userKey, images }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const sorted = useMemo(() => [...images].sort((a, b) => a.position - b.position), [images])

  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenIdx(null)
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [openIdx])

  const opened = openIdx !== null ? sorted[openIdx] : null

  return (
    <main className="mx-auto w-full max-w-5xl pb-12">
      <div className="mx-auto w-full sm:mt-6 sm:max-w-[400px]">
        
        {/* ভিডিওর ওপরে টাইটেল এবং ব্যাক বাটন (ভিডিওর বাইরে) */}
        <div className="mb-3 flex items-center gap-3 px-4 sm:px-0">
          <Link
            href={`/?class=${maxUnlocked}&key=${encodeURIComponent(userKey)}`}
            aria-label="ক্লাস তালিকায় ফিরে যান"
            className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-white drop-shadow">
              ক্লাস {classNo} — {title?.trim() || 'ক্লাস রেকডিং'}
            </span>
            <span className="block truncate text-xs text-neutral-400">ইক্বরা ইসলামিক মাদরাসা</span>
          </span>
        </div>

        {/* ভিডিও প্লেয়ার */}
        <YouTubePlayer key={youtubeId} videoId={youtubeId} />

        {/* ভিডিওর নিচে এক্সটার্নাল লিংক বাটন */}
        <div className="mt-4 flex gap-3 px-4 sm:px-0">
          <a
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnGhost} flex-1`}
          >
            <ExternalLink className="size-4" />
            YouTube-এ দেখুন
          </a>
        </div>
      </div>

      {sorted.length > 0 && (
        <section className="mt-10 px-4">
          <h2 className="mb-4 text-lg font-semibold">ছবিসমূহ</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((img, i) => (
              <ImageCard key={img.id} src={img.url} alt={`ক্লাস ${classNo} ছবি ${i + 1}`} onView={() => setOpenIdx(i)} />
            ))}
          </div>
        </section>
      )}

      {opened && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3"
          onClick={() => setOpenIdx(null)}
        >
          <button
            type="button"
            aria-label="বন্ধ করুন"
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <div
            className="aspect-[9/16] h-[88dvh] max-w-[94vw] overflow-hidden rounded-xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={opened.url} alt={`ছবি ${(openIdx ?? 0) + 1}`} className="size-full object-contain" />
          </div>
        </div>
      )}
    </main>
  )
}