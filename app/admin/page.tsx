'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddVideoModal from '@/components/AddVideoModal'
import AdminVideoItem from '@/components/AdminVideoItem'
import { btnGhost, btnPrimary } from '@/lib/ui'
import type { AdminVideoRow } from '@/lib/types'

export default function Admin() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [authed, setAuthed] = useState(false)
  const [videos, setVideos] = useState<AdminVideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
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
      .select('id, slug, youtube_id, title, class_no, access_key, created_at, video_images(id, position, image_id, images(id, url))')
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
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">অ্যাডমিন প্যানেল</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className={btnGhost}>
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">পাবলিক পেজ</span>
          </a>
          <button onClick={logout} className={btnGhost} aria-label="লগআউট">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">লগআউট</span>
          </button>
        </div>
      </header>

      <button
        onClick={() => setModal(true)}
        className={`${btnPrimary} w-full py-3.5 text-base`}
      >
        <Plus className="size-5" />
        নতুন ক্লাস (ভিডিও) যুক্ত করুন
      </button>

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
    </main>
  )
}
