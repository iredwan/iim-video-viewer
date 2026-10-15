'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId } from '@/lib/youtube'
import { compressImage } from '@/lib/image'

type Img = { id: string; url: string; position: number }
type Batch = { id: string; name: string; youtube_id: string; batch_images: Img[] }

async function uploadImages(files: File[], onProgress: (n: number) => void): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = await compressImage(files[i])
    const fd = new FormData()
    fd.append('image', f)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'আপলোড ব্যর্থ')
    urls.push(json.url)
    onProgress(i + 1)
  }
  return urls
}

export default function Admin() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, youtube_id, batch_images(id, url, position)')
      .order('created_at', { ascending: true })
    if (error) setMsg({ type: 'err', text: error.message })
    else setBatches((data ?? []) as Batch[])
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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const vid = extractYouTubeId(link)
    if (!vid) return setMsg({ type: 'err', text: 'ইউটিউব লিংকটি সঠিক নয়' })
    setBusy(true)
    try {
      const urls = await uploadImages(files, (n) => setProgress(`ছবি আপলোড: ${n}/${files.length}`))
      const { data: b, error } = await supabase
        .from('batches')
        .insert({ name: name.trim(), youtube_id: vid })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      if (urls.length) {
        const { error: e2 } = await supabase
          .from('batch_images')
          .insert(urls.map((url, i) => ({ batch_id: b.id, url, position: i })))
        if (e2) throw new Error(e2.message)
      }
      setName('')
      setLink('')
      setFiles([])
      ;(document.getElementById('new-files') as HTMLInputElement).value = ''
      setMsg({ type: 'ok', text: 'ব্যাচ যোগ হয়েছে' })
      await load()
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message })
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <main className="container">
      <header className="bar">
        <h1>অ্যাডমিন প্যানেল</h1>
        <div className="row">
          <a href="/" target="_blank" rel="noreferrer">
            পাবলিক পেজ ↗
          </a>
          <button onClick={logout}>লগআউট</button>
        </div>
      </header>

      <form onSubmit={create} className="card stack">
        <h2>নতুন ব্যাচ</h2>
        <label>
          ব্যাচের নাম
          <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          ইউটিউব ভিডিও লিংক
          <input
            required
            placeholder="https://www.youtube.com/watch?v=..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </label>
        <label>
          ছবি (একাধিক নেওয়া যাবে)
          <input
            id="new-files"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        {msg && <p className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</p>}
        {progress && <p className="hint">{progress}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'অপেক্ষা করুন…' : 'ব্যাচ সংরক্ষণ করুন'}
        </button>
      </form>

      <h2>সব ব্যাচ</h2>
      {loading ? (
        <p>লোড হচ্ছে…</p>
      ) : batches.length === 0 ? (
        <p className="empty">কোনো ব্যাচ নেই</p>
      ) : (
        batches.map((b) => <BatchCard key={b.id} batch={b} onChange={load} />)
      )}
    </main>
  )
}

function BatchCard({ batch, onChange }: { batch: Batch; onChange: () => Promise<void> }) {
  const [supabase] = useState(() => createClient())
  const [name, setName] = useState(batch.name)
  const [link, setLink] = useState(`https://youtu.be/${batch.youtube_id}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const images = [...batch.batch_images].sort((a, b) => a.position - b.position)

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

  const save = () =>
    run(async () => {
      const vid = extractYouTubeId(link)
      if (!vid) throw new Error('ইউটিউব লিংকটি সঠিক নয়')
      const { error } = await supabase
        .from('batches')
        .update({ name: name.trim(), youtube_id: vid })
        .eq('id', batch.id)
      if (error) throw new Error(error.message)
    })

  const addImages = (list: File[]) =>
    run(async () => {
      if (!list.length) return
      const urls = await uploadImages(list, (n) => setMsg(`আপলোড: ${n}/${list.length}`))
      const start = images.length ? Math.max(...images.map((i) => i.position)) + 1 : 0
      const { error } = await supabase
        .from('batch_images')
        .insert(urls.map((url, i) => ({ batch_id: batch.id, url, position: start + i })))
      if (error) throw new Error(error.message)
    })

  const delImage = (id: string) =>
    run(async () => {
      if (!confirm('ছবিটি মুছবেন?')) return
      const { error } = await supabase.from('batch_images').delete().eq('id', id)
      if (error) throw new Error(error.message)
    })

  const delBatch = () =>
    run(async () => {
      if (!confirm(`"${batch.name}" ব্যাচ ও এর সব ছবি মুছবেন?`)) return
      const { error } = await supabase.from('batches').delete().eq('id', batch.id)
      if (error) throw new Error(error.message)
    })

  return (
    <div className="card stack">
      <div className="grid2">
        <label>
          নাম
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          ইউটিউব লিংক
          <input value={link} onChange={(e) => setLink(e.target.value)} />
        </label>
      </div>

      <div className="thumbs">
        {images.map((img) => (
          <div key={img.id} className="athumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
            <button type="button" onClick={() => delImage(img.id)} disabled={busy} aria-label="ছবি মুছুন">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="row wrap">
        <label className="filebtn">
          + ছবি যোগ করুন
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              addImages(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </label>
        <button className="primary" onClick={save} disabled={busy}>
          সংরক্ষণ
        </button>
        <button className="danger" onClick={delBatch} disabled={busy}>
          ব্যাচ মুছুন
        </button>
        {msg && <span className="hint">{msg}</span>}
      </div>
    </div>
  )
}
