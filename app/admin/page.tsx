'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, FolderPlus, Loader2, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddVideoModal from '@/components/AddVideoModal'
import AdminVideoItem from '@/components/AdminVideoItem'
import { btnGhost, btnPrimary, iconBtn, inputCls } from '@/lib/ui'
import type { BatchRow } from '@/lib/types'

export default function Admin() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [newBatch, setNewBatch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, videos(id, slug, youtube_id, title, created_at, video_images(id, url, position))')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else {
      setError('')
      const rows = (data ?? []) as unknown as BatchRow[]
      setBatches(
        rows.map((b) => ({
          ...b,
          videos: [...b.videos].sort((x, y) => x.created_at.localeCompare(y.created_at)),
        }))
      )
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
    router.refresh()
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const addBatch = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBatch.trim()
    if (!name) return
    run(async () => {
      const { error } = await supabase.from('batches').insert({ name })
      if (error) throw new Error(error.message)
      setNewBatch('')
    })
  }

  const renameBatch = (b: BatchRow) => {
    const name = window.prompt('ব্যাচের নতুন নাম', b.name)?.trim()
    if (!name || name === b.name) return
    run(async () => {
      const { error } = await supabase.from('batches').update({ name }).eq('id', b.id)
      if (error) throw new Error(error.message)
    })
  }

  const deleteBatch = (b: BatchRow) => {
    if (!confirm(`"${b.name}" ব্যাচ ও এর ${b.videos.length} টি ভিডিও মুছবেন?`)) return
    run(async () => {
      const { error } = await supabase.from('batches').delete().eq('id', b.id)
      if (error) throw new Error(error.message)
    })
  }

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
        disabled={batches.length === 0}
        className={`${btnPrimary} w-full py-3.5 text-base`}
      >
        <Plus className="size-5" />
        নতুন ভিডিও যুক্ত করুন
      </button>
      {!loading && batches.length === 0 && (
        <p className="mt-2 text-center text-sm text-neutral-400">ভিডিও যুক্ত করার আগে নিচে একটি ব্যাচ তৈরি করুন।</p>
      )}

      <form onSubmit={addBatch} className="mt-4 flex gap-2">
        <input
          value={newBatch}
          onChange={(e) => setNewBatch(e.target.value)}
          placeholder="নতুন ব্যাচের নাম"
          maxLength={120}
          className={inputCls}
        />
        <button className={`${btnGhost} shrink-0`} disabled={busy || !newBatch.trim()}>
          <FolderPlus className="size-4" />
          <span className="hidden sm:inline">ব্যাচ তৈরি</span>
        </button>
      </form>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          batches.map((b) => (
            <section key={b.id}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{b.name}</h2>
                <span className="text-xs text-neutral-500">{b.videos.length} ভিডিও</span>
                <button onClick={() => renameBatch(b)} className={iconBtn} aria-label="নাম বদলান" title="নাম বদলান">
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => deleteBatch(b)} className={iconBtn} aria-label="ব্যাচ মুছুন" title="ব্যাচ মুছুন">
                  <Trash2 className="size-4 text-red-400" />
                </button>
              </div>
              {b.videos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-neutral-500">
                  এই ব্যাচে কোনো ভিডিও নেই
                </p>
              ) : (
                <ul className="space-y-3">
                  {b.videos.map((v, i) => (
                    <AdminVideoItem key={v.id} video={v} index={i} onChange={load} />
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>

      {modal && (
        <AddVideoModal
          batches={batches.map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setModal(false)}
          onAdded={load}
        />
      )}
    </main>
  )
}
