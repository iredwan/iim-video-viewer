'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, ImagePlus, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId, ytThumb } from '@/lib/youtube'
import { uploadImages } from '@/lib/upload'
import { btnGhost, btnPrimary, iconBtn, inputCls } from '@/lib/ui'
import type { VideoRow } from '@/lib/types'

type Props = { video: VideoRow; index: number; onChange: () => Promise<void> }

export default function AdminVideoItem({ video, index, onChange }: Props) {
  const [supabase] = useState(() => createClient())
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState(`https://youtu.be/${video.youtube_id}`)
  const [title, setTitle] = useState(video.title ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const images = [...(video.video_images ?? [])].sort((a, b) => a.position - b.position)
  const path = `/v/${video.slug}`

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      await onChange()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('লিংক কপি করুন', url)
    }
  }

  const saveLink = () =>
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
    })

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ytThumb(video.youtube_id)} alt="" className="h-16 w-9 shrink-0 rounded-md bg-black object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{video.title?.trim() || `ভিডিও ${index + 1}`}</p>
          <p className="truncate text-xs text-neutral-400">{path}</p>
          <p className="text-xs text-neutral-500">{images.length} টি ছবি</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={copy} className={iconBtn} aria-label="লিংক কপি" title="লিংক কপি">
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          </button>
          <a href={path} target="_blank" rel="noreferrer" className={iconBtn} aria-label="খুলুন" title="খুলুন">
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={iconBtn}
            aria-label="এডিট"
            title="এডিট"
          >
            {open ? <X className="size-4" /> : <Pencil className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="ভিডিওর টাইটেল"
              className={inputCls}
              aria-label="ভিডিওর টাইটেল"
            />
            <div className="flex gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} aria-label="ইউটিউব লিংক" />
              <button type="button" onClick={saveLink} disabled={busy} className={`${btnPrimary} shrink-0`}>
                <Save className="size-4" />
                <span className="hidden sm:inline">সংরক্ষণ</span>
              </button>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => delImage(img.id)}
                    disabled={busy}
                    aria-label="ছবি মুছুন"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/75 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className={`${btnGhost} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
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
            <button
              type="button"
              onClick={delVideo}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              ভিডিও মুছুন
            </button>
            {busy && <Loader2 className="size-4 animate-spin text-neutral-400" />}
            {msg && <span className="text-sm text-neutral-400">{msg}</span>}
          </div>
        </div>
      )}
    </li>
  )
}
