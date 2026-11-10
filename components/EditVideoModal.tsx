'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, ImagePlus, Images, Loader2, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId } from '@/lib/youtube'
import { uploadToLibrary } from '@/lib/upload'
import { btnDanger, btnGhost, btnPrimary, inputCls } from '@/lib/ui'
import type { AdminVideoRow, LibraryImage } from '@/lib/types'

type Props = {
  video: AdminVideoRow
  onClose: () => void
  onChange: () => Promise<void>
}

type Attached = { linkId: string; imageId: string; position: number; url: string }

export default function EditVideoModal({ video, onClose, onChange }: Props) {
  const [supabase] = useState(() => createClient())
  const [title, setTitle] = useState(video.title ?? '')
  const [link, setLink] = useState(`https://youtu.be/${video.youtube_id}`)
  const [classNo, setClassNo] = useState(String(video.class_no))
  const [accessKey, setAccessKey] = useState(video.access_key)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [library, setLibrary] = useState<LibraryImage[] | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const attached = useMemo(
    () =>
      [...(video.video_images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((l) => ({ linkId: l.id, imageId: l.image_id, position: l.position, url: l.images?.url ?? '' }))
        .filter((x) => x.url),
    [video]
  )

  // মিউটেশনের পর প্যারেন্ট রিলোড করলে ভিডিও অবজেক্ট নতুন হয় — তখন ফিল্ডগুলো সেভ হওয়া মানে সিঙ্ক হবে
  useEffect(() => {
    setTitle(video.title ?? '')
    setLink(`https://youtu.be/${video.youtube_id}`)
    setClassNo(String(video.class_no))
    setAccessKey(video.access_key)
  }, [video])

  useEffect(() => {
    supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setLibrary((data ?? []) as LibraryImage[]))
  }, [supabase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (preview) setPreview(null)
      else if (!busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [busy, onClose, preview])

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
      const cls = Number(classNo)
      if (!Number.isInteger(cls) || cls < 1) throw new Error('সঠিক ক্লাস নাম্বার দিন')
      const key = accessKey.trim()
      if (!key) throw new Error('পাসওয়ার্ড (গ্রুপের কী) দিন')
      const { error } = await supabase
        .from('videos')
        .update({ class_no: cls, access_key: key, youtube_id: vid, title: name })
        .eq('id', video.id)
      if (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new Error('এই ক্লাস নাম্বার আগেই আছে — অন্য নাম্বার দিন')
        }
        throw new Error(error.message)
      }
    })

  const detach = (linkId: string) =>
    run(async () => {
      const { error } = await supabase.from('video_images').delete().eq('id', linkId)
      if (error) throw new Error(error.message)
    })

  const attach = (image: LibraryImage) =>
    run(async () => {
      const position = attached.length ? Math.max(...attached.map((a) => a.position)) + 1 : 0
      const { error } = await supabase
        .from('video_images')
        .insert({ video_id: video.id, image_id: image.id, position })
      if (error) throw new Error(error.message)
    })

  const delImage = (im: LibraryImage) =>
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
      setLibrary((prevEdit) => (prevEdit ?? []).filter((x) => x.id !== im.id))
      setPreview((p) => (p === im.url ? null : p))
    })

  const addFiles = (list: File[]) =>
    run(async () => {
      if (!list.length) return
      const added = await uploadToLibrary(list, (n) => setMsg(`আপলোড: ${n}/${list.length}`))
      const base = attached.length ? Math.max(...attached.map((a) => a.position)) + 1 : 0
      const { error } = await supabase
        .from('video_images')
        .insert(added.map((im, i) => ({ video_id: video.id, image_id: im.id, position: base + i })))
      if (error) throw new Error(error.message)
      setLibrary((prev) => [...added, ...(prev ?? [])].slice(0, 300))
      setMsg('')
    })

  const delVideo = () =>
    run(async () => {
      if (!confirm('এই ভিডিও মুছবেন? লাইব্রেরির ছবিগুলো থাকবে, শুধু এই ভিডিও থেকে লিংক সরানো হবে। শেয়ার লিংকও কাজ করবে না।')) return
      const { error } = await supabase.from('videos').delete().eq('id', video.id)
      if (error) throw new Error(error.message)
      onClose()
    })

  return (
    <>
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

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5 text-sm text-neutral-400">
            ক্লাস নাম্বার
            <input
              type="number"
              min={1}
              value={classNo}
              onChange={(e) => setClassNo(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5 text-sm text-neutral-400">
            পাসওয়ার্ড (কী)
            <input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className={inputCls}
              placeholder="গ্রুপ লিংকের কী"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm text-neutral-400">
          ভিডিওর টাইটেল
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={`ক্লাস ${classNo}`}
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

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Images className="size-4" />
            এই ভিডিওতে যুক্ত ({attached.length})
          </div>
          {attached.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {attached.map((a) => (
                <div key={a.linkId} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPreview(a.url)}
                    aria-label="বড় করে দেখুন"
                    title="বড় করে দেখুন"
                    className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/75 text-white transition hover:text-blue-300"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => detach(a.linkId)}
                    disabled={busy}
                    aria-label="সরান"
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
            নতুন ছবি আপলোড করুন
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>

          <div className="space-y-2">
            <div className="mb-1 text-xs text-neutral-500">
              লাইব্রেরি — আপলোড করা সব ছবি এখানে জমা থাকে। ছবিতে ক্লিক করলে এই ভিডিওতে যুক্ত/বাদ হবে (নীল ডোরা = যুক্ত)। চোখে বড় দেখা, ট্র্যাশে মুছুন।
            </div>
            {library === null ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-neutral-500" />
              </div>
            ) : library.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {library.map((im) => {
                  const link = (video.video_images ?? []).find((l) => l.image_id === im.id)
                  return (
                    <div
                      key={im.id}
                      className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-black transition ${link ? 'ring-2 ring-blue-500' : 'ring-1 ring-white/10 hover:ring-blue-500'} ${busy ? 'opacity-60' : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt="" loading="lazy" className="pointer-events-none size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => (link ? detach(link.id) : attach(im))}
                        disabled={busy}
                        className="absolute inset-0"
                        title={link ? 'ভিডিও থেকে বাদ দিন' : 'এই ভিডিওতে যুক্ত করুন'}
                        aria-label={link ? 'ভিডিও থেকে বাদ দিন' : 'এই ভিডিওতে যুক্ত করুন'}
                      />
                      <button
                        type="button"
                        onClick={() => setPreview(im.url)}
                        disabled={busy}
                        className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/75 text-white transition hover:text-blue-300 disabled:opacity-50"
                        title="বড় করে দেখুন"
                        aria-label="বড় করে দেখুন"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => delImage(im)}
                        disabled={busy}
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/75 text-white transition hover:text-red-400 disabled:opacity-50"
                        title="লাইব্রেরি থেকে মুছুন"
                        aria-label="লাইব্রেরি থেকে মুছুন"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      {link && (
                        <span
                          className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-full bg-blue-600 text-white"
                          title="এই ভিডিওতে যুক্ত আছে"
                        >
                          <Check className="size-3" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">লাইব্রেরি খালি — উপরের বাটন থেকে ছবি আপলোড করুন।</p>
            )}
          </div>
        </div>

        <button onClick={delVideo} disabled={busy} className={`${btnDanger} w-full`}>
          <Trash2 className="size-4" />
          ভিডিও মুছুন
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {msg && <p className="text-sm text-neutral-400">{msg}</p>}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="লাইব্রেরির ছবি"
          className="max-h-[88dvh] max-w-[94vw] rounded-xl bg-black object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}
