'use client'

import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Loader2, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId } from '@/lib/youtube'
import { uploadImages } from '@/lib/upload'
import { btnDanger, btnGhost, btnPrimary, inputCls } from '@/lib/ui'
import type { VideoRow } from '@/lib/types'

type Props = {
  video: VideoRow
  index: number
  onClose: () => void
  onChange: () => Promise<void>
}

export default function EditVideoModal({ video, index, onClose, onChange }: Props) {
  const [supabase] = useState(() => createClient())
  const [title, setTitle] = useState(video.title ?? '')
  const [link, setLink] = useState(`https://youtu.be/${video.youtube_id}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const images = useMemo(
    () => [...(video.video_images ?? [])].sort((a, b) => a.position - b.position),
    [video]
  )

  // মিউটেশনের পর প্যারেন্ট রিলোড করলে ভিডিও অবজেক্ট নতুন হয় — তখন ফিল্ডগুলো সেভ হওয়া মানে সিঙ্ক হবে
  useEffect(() => {
    setTitle(video.title ?? '')
    setLink(`https://youtu.be/${video.youtube_id}`)
  }, [video])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [busy, onClose])

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

  const save = () =>
    run(async () => {
      const name = title.trim()
      if (!name) throw new Error('ভিডিওর টাইটেল দিন')
      const vid = extractYouTubeId(link)
      if (!vid) throw new Error('ইউটিউব লিংকটি সঠিক নয়')
      const { error } = await supabase.from('videos').update({ youtube_id: vid, title: name }).eq('id', video.id)
      if (error) throw new Error(error.message)
    })

  const addImages = (list: File[]) =>
    run(async () => {
      if (!list.length) return
      const urls = await uploadImages(list, (n) => setMsg(`আপলোড: ${n}/${list.length}`))
      const start = images.length ? Math.max(...images.map((i) => i.position)) + 1 : 0
      const { error } = await supabase
        .from('video_images')
        .insert(urls.map((url, i) => ({ video_id: video.id, url, position: start + i })))
      if (error) throw new Error(error.message)
      setMsg('')
    })

  const delImage = (id: string) =>
    run(async () => {
      if (!confirm('ছবিটি মুছবেন?')) return
      const { error } = await supabase.from('video_images').delete().eq('id', id)
      if (error) throw new Error(error.message)
    })

  const delVideo = () =>
    run(async () => {
      if (!confirm('এই ভিডিও ও এর সব ছবি মুছবেন? শেয়ার লিংকও কাজ করবে না।')) return
      const { error } = await supabase.from('videos').delete().eq('id', video.id)
      if (error) throw new Error(error.message)
      onClose()
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-neutral-900 p-5 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">ভিডিও সম্পাদনা</h2>
            <p className="truncate text-xs text-neutral-500">{`/v/${video.slug}`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="বন্ধ করুন"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ভিডিওর টাইটেল
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={`ভিডিও ${index + 1}`}
            className={inputCls}
          />
        </label>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ইউটিউব লিংক
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputCls}
          />
        </label>

        <button onClick={save} disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          সংরক্ষণ
        </button>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <span className="block text-sm text-neutral-400">ছবি ({images.length})</span>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => delImage(img.id)}
                    disabled={busy}
                    aria-label="ছবি মুছুন"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/75 text-white disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className={`${btnGhost} w-full cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <ImagePlus className="size-4" />
            ছবি যোগ করুন
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addImages(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
        </div>

        <button onClick={delVideo} disabled={busy} className={`${btnDanger} w-full`}>
          <Trash2 className="size-4" />
          ভিডিও মুছুন
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {msg && <p className="text-sm text-neutral-400">{msg}</p>}
      </div>
    </div>
  )
}
