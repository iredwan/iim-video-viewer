'use client'

import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId } from '@/lib/youtube'
import { uploadImages } from '@/lib/upload'
import { btnGhost, btnPrimary, inputCls } from '@/lib/ui'

type Props = {
  batches: { id: string; name: string }[]
  defaultBatchId?: string
  onClose: () => void
  onAdded: () => Promise<void> | void
}

export default function AddVideoModal({ batches, defaultBatchId, onClose, onAdded }: Props) {
  const [supabase] = useState(() => createClient())
  const [batchId, setBatchId] = useState(defaultBatchId ?? batches[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!batchId) return setError('একটি ব্যাচ নির্বাচন করুন')
    const name = title.trim()
    if (!name) return setError('ভিডিওর টাইটেল দিন')
    const vid = extractYouTubeId(link)
    if (!vid) return setError('ইউটিউব লিংকটি সঠিক নয়')

    setBusy(true)
    try {
      const urls = await uploadImages(files, (n) => setProgress(`ছবি আপলোড: ${n}/${files.length}`))
      setProgress('সংরক্ষণ হচ্ছে…')
      const { data: v, error: e1 } = await supabase
        .from('videos')
        .insert({ batch_id: batchId, youtube_id: vid, title: name })
        .select('id')
        .single()
      if (e1) throw new Error(e1.message)
      if (urls.length) {
        const { error: e2 } = await supabase
          .from('video_images')
          .insert(urls.map((url, i) => ({ video_id: v.id, url, position: i })))
        if (e2) {
          await supabase.from('videos').delete().eq('id', v.id)
          throw new Error(e2.message)
        }
      }
      await onAdded()
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-neutral-900 p-5 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">নতুন ভিডিও যুক্ত করুন</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="বন্ধ করুন"
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ব্যাচ
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} required className={inputCls}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ভিডিওর টাইটেল
          <input
            required
            maxLength={200}
            placeholder="ভিডিওর নাম"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ইউটিউব ভিডিও লিংক
          <input
            required
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={inputCls}
          />
        </label>

        <div className="space-y-2">
          <span className="block text-sm text-neutral-400">ছবি (একাধিক নেওয়া যাবে)</span>
          <label className={`${btnGhost} w-full cursor-pointer`}>
            <ImagePlus className="size-4" />
            ছবি বাছাই করুন
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                setFiles((prev) => [...prev, ...picked])
                e.target.value = ''
              }}
            />
          </label>
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="সরান"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {progress && <p className="text-sm text-neutral-400">{progress}</p>}

        <button className={`${btnPrimary} w-full`} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {busy ? 'অপেক্ষা করুন…' : 'যুক্ত করুন'}
        </button>
      </form>
    </div>
  )
}
