'use client'

import { Eye } from 'lucide-react'

type Props = { src: string; alt: string; onView: () => void }

export default function ImageCard({ src, alt, onView }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
      <button type="button" onClick={onView} aria-label="ছবি দেখুন" className="block aspect-[9/16] w-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="size-full object-contain" />
      </button>
      <div className="p-2">
        <button
          type="button"
          onClick={onView}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-[.98]"
        >
          <Eye className="size-4" />
          ভিউ
        </button>
      </div>
    </div>
  )
}
