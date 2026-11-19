'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, Loader2, Repeat, Search, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { replaceLibraryImage } from '@/lib/upload'
import { inputCls } from '@/lib/ui'
import type { AdminVideoRow } from '@/lib/types'

type Props = { videos: AdminVideoRow[]; onClose: () => void; onChange: () => Promise<void> }
type Preview = { urls: string[]; idx: number }
type Img = { id: string; url: string; path: string | null }

// বাংলা সংখ্যা (০-৯) ইংরেজিতে রূপান্তর — সার্চে ক্লাস নাম্বার মেলাতে
const bnToEn = (s: string) => s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))

function imagesOf(v: AdminVideoRow): Img[] {
  return [...(v.video_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({ id: l.image_id, url: l.images?.url ?? '', path: l.images?.path ?? null }))
    .filter((im) => im.url)
}

export default function ImageLibraryBrowser({ videos, onClose, onChange }: Props) {
  const [supabase] = useState(() => createClient())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(videos[0]?.id ?? null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replaceTarget, setReplaceTarget] = useState<Img | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null)
      else if (e.key === 'ArrowRight')
        setPreview((p) => (p ? { ...p, idx: (p.idx + 1) % p.urls.length } : p))
      else if (e.key === 'ArrowLeft')
        setPreview((p) => (p ? { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length } : p))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const num = bnToEn(query.trim())
    return [...videos]
      .sort((a, b) => a.class_no - b.class_no)
      .filter((v) => {
        if (!q) return true
        const byTitle = (v.title ?? '').toLowerCase().includes(q)
        const byClass = num !== '' && String(v.class_no).includes(num)
        return byTitle || byClass
      })
  }, [videos, query])

  const go = (dir: 1 | -1) =>
    setPreview((p) => (p ? { ...p, idx: (p.idx + dir + p.urls.length) % p.urls.length } : p))

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await onChange()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const delImage = (im: Img) =>
    run(async () => {
      if (!confirm('লাইব্রেরি থেকে এই ছবিটি মুছবেন? এটি যেসব ভিডিওতে যুক্ত আছে সেখান থেকেও সরে যাবে।')) return
      // ক্রম: ভিডিও-লিংক → স্টোরেজ ফাইল → লাইব্রেরি রেকর্ড
      const { error: linkErr } = await supabase.from('video_images').delete().eq('image_id', im.id)
      if (linkErr) throw new Error(linkErr.message)
      if (im.path) {
        const { error: storeErr } = await supabase.storage.from('class-images').remove([im.path])
        if (storeErr) throw new Error(storeErr.message)
      }
      const { error: rowErr } = await supabase.from('images').delete().eq('id', im.id)
      if (rowErr) throw new Error(rowErr.message)
      setPreview((p) => (p && p.urls[p.idx] === im.url ? null : p))
    })

  const pickReplace = (im: Img) => {
    setReplaceTarget(im)
    replaceInputRef.current?.click()
  }

  const onReplacePicked = (file: File | undefined) => {
    const target = replaceTarget
    if (!file || !target) return
    if (!confirm('নতুন ছবি দিয়ে বদলানো হবে? পুরনো ছবিটি স্টোরেজসহ মুছে যাবে।')) return
    run(async () => {
      await replaceLibraryImage(supabase, { imageId: target.id, path: target.path }, file)
      setPreview((p) => (p && p.urls[p.idx] === target.url ? null : p))
      setReplaceTarget(null)
    })
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-neutral-900 sm:max-w-3xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-5 pb-4">
          <div>
            <h2 className="text-lg font-bold">ছবি লাইব্রেরি</h2>
            <p className="text-xs text-neutral-500">ক্লাস অনুযায়ী ছবি — ক্লাস নাম্বার বা টাইটেল দিয়ে খুঁজুন</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="বন্ধ করুন"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">

        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-500">
            <Search className="size-4" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ক্লাস নাম্বার বা ভিডিওর টাইটেল দিয়ে খুঁজুন..."
            className={`${inputCls} pl-10`}
            aria-label="ক্লাস বা টাইটেল খুঁজুন"
          />
        </div>

        {videos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-neutral-500">
            এখনও কোনো ক্লাস (ভিডিও) নেই।
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">কোনো ক্লাস পাওয়া যায়নি।</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((v) => {
              const imgs = imagesOf(v)
              const open = openId === v.id
              return (
                <li key={v.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : v.id)}
                    className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/5"
                  >
                    <ChevronRight
                      className={`size-4 shrink-0 text-neutral-400 transition ${open ? 'rotate-90' : ''}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        <span className="text-blue-400">ক্লাস {v.class_no}</span>
                        {v.title?.trim() ? ` — ${v.title.trim()}` : ''}
                      </span>
                      <span className="block text-xs text-neutral-500">{imgs.length} টি ছবি</span>
                    </span>
                    <Images className="size-4 shrink-0 text-neutral-500" />
                  </button>

                  {open &&
                    (imgs.length > 0 ? (
                      <div className={`grid grid-cols-3 gap-2 border-t border-white/10 p-3 sm:grid-cols-4 ${busy ? 'opacity-60' : ''}`}>
                        {imgs.map((im, i) => (
                          <div
                            key={`${v.id}-${im.id}`}
                            className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black ring-1 ring-white/10 transition hover:ring-blue-500"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={im.url}
                              alt={`ক্লাস ${v.class_no} ছবি ${i + 1}`}
                              loading="lazy"
                              className="pointer-events-none size-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPreview({ urls: imgs.map((x) => x.url), idx: i })}
                              className="absolute inset-0"
                              title="বড় করে দেখুন"
                              aria-label={`ছবি ${i + 1} বড় করে দেখুন`}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                pickReplace(im)
                              }}
                              disabled={busy}
                              aria-label="ছবি বদলান"
                              title="ছবি বদলান"
                              className="absolute left-1 top-1 z-10 grid size-6 place-items-center rounded-full bg-black/75 text-white transition hover:text-blue-300 disabled:opacity-50"
                            >
                              <Repeat className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                delImage(im)
                              }}
                              disabled={busy}
                              aria-label="লাইব্রেরি থেকে মুছুন"
                              title="লাইব্রেরি থেকে মুছুন"
                              className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-full bg-black/75 text-white transition hover:text-red-400 disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="border-t border-white/10 p-3 text-xs text-neutral-500">এই ক্লাসে কোনো ছবি নেই।</p>
                    ))}
                </li>
              )
            })}
          </ul>
        )}

        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onReplacePicked(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {busy && (
          <div className="flex justify-center py-1">
            <Loader2 className="size-4 animate-spin text-neutral-500" />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>

    {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-3"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="বন্ধ করুন"
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="আগের ছবি"
            className="absolute left-2 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.urls[preview.idx]}
            alt={`ছবি ${preview.idx + 1}`}
            className="max-h-[80dvh] max-w-[86vw] rounded-xl bg-black object-contain sm:max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="পরের ছবি"
            className="absolute right-2 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="size-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums text-white">
            {preview.idx + 1} / {preview.urls.length}
          </span>
        </div>
      )}
    </>
  )
}
