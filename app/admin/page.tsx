'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Images, Loader2, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddVideoModal from '@/components/AddVideoModal'
import AdminVideoItem from '@/components/AdminVideoItem'
import ImageLibraryBrowser from '@/components/ImageLibraryBrowser'
import { btnGhost, btnPrimary } from '@/lib/ui'
import type { AdminVideoRow } from '@/lib/types'

export default function Admin() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [authed, setAuthed] = useState(false)
  const [videos, setVideos] = useState<AdminVideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/admin/login')
      else setAuthed(true)
    })
  }, [supabase, router])

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('id, slug, youtube_id, title, class_no, access_key, created_at, video_images(id, position, image_id, images(id, url, path))')
      .order('class_no', { ascending: true })
    if (error) setError(error.message)
    else {
      setError('')
      setVideos((data ?? []) as unknown as AdminVideoRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (authed) load()
  }, [authed, load])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
    router.refresh()
  }

  if (!authed) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </main>
    )
  }

  // নতুন ভিডিওর জন্য পরামর্শ: সর্বোচ্চ ক্লাস + ১, পাসওয়ার্ড = সর্বশেষ ক্লাসের পাসওয়ার্ড
  const nextClass = videos.reduce((m, v) => Math.max(m, v.class_no), 0) + 1
  const lastKey = videos.length ? videos[videos.length - 1].access_key : ''

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-bold sm:text-xl">অ্যাডমিন প্যানেল</h1>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button onClick={() => setModal(true)} className={btnPrimary}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">নতুন ক্লাস (ভিডিও) যুক্ত করুন</span>
            <span className="sm:hidden">নতুন ক্লাস</span>
          </button>
          <a href="/" target="_blank" rel="noreferrer" className={btnGhost} aria-label="পাবলিক পেজ" title="পাবলিক পেজ">
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">পাবলিক পেজ</span>
          </a>
          <button onClick={() => setLibOpen(true)} className={btnGhost} aria-label="ছবি লাইব্রেরি" title="ছবি লাইব্রেরি">
            <Images className="size-4" />
            <span className="hidden sm:inline">ছবি লাইব্রেরি</span>
          </button>
          <button onClick={logout} className={btnGhost} aria-label="লগআউট">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">লগআউট</span>
          </button>
        </div>
      </header>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-neutral-400" />
          </div>
        ) : videos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-neutral-500">
            এখনও কোনো ক্লাস (ভিডিও) নেই — উপরের বাটন থেকে ক্লাস ১ যুক্ত করুন।
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">সব ক্লাস</h2>
              <span className="text-xs text-neutral-500">{videos.length} টি</span>
            </div>
            <ul className="space-y-3">
              {videos.map((v) => (
                <AdminVideoItem key={v.id} video={v} onChange={load} />
              ))}
            </ul>
          </>
        )}
      </div>

      {modal && (
        <AddVideoModal
          nextClass={nextClass}
          defaultKey={lastKey}
          onClose={() => setModal(false)}
          onAdded={load}
        />
      )}

      {libOpen && <ImageLibraryBrowser videos={videos} onClose={() => setLibOpen(false)} onChange={load} />}
    </main>
  )
}
