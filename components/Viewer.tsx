'use client'

import { useEffect, useMemo, useState } from 'react'
import YouTubePlayer from './YouTubePlayer'
import ImageCard, { downloadHref } from './ImageCard'

export type ImageRow = { id: string; url: string; position: number }
export type BatchRow = { id: string; name: string; youtube_id: string; batch_images: ImageRow[] }

export default function Viewer({ batches }: { batches: BatchRow[] }) {
  const [id, setId] = useState(batches[0]?.id ?? '')
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('batch')
    if (q && batches.some((b) => b.id === q)) setId(q)
  }, [batches])

  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenIdx(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIdx])

  const batch = useMemo(() => batches.find((b) => b.id === id), [batches, id])
  const images = useMemo(
    () => [...(batch?.batch_images ?? [])].sort((a, b) => a.position - b.position),
    [batch]
  )

  function choose(v: string) {
    setId(v)
    setOpenIdx(null)
    window.history.replaceState(null, '', `?batch=${v}`)
  }

  if (!batches.length) return <p className="empty">এখনও কোনো ব্যাচ যোগ করা হয়নি।</p>

  const opened = openIdx !== null ? images[openIdx] : null

  return (
    <>
      <div className="picker">
        <label htmlFor="batch">ব্যাচ নির্বাচন করুন</label>
        <select id="batch" value={id} onChange={(e) => choose(e.target.value)}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {batch && (
        <section>
          <div className="video-col">
            <YouTubePlayer key={batch.youtube_id} videoId={batch.youtube_id} />
            <a
              className="btn-dl btn-lg"
              href={`https://www.youtube.com/watch?v=${batch.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              ⬇ YouTube-এ ডাউনলোড করুন
            </a>
            <p className="hint">
              শর্টকাট: Space/K = প্লে/পজ · ←/→ = ৫ সে · J/L = ১০ সে · ↑/↓ = ভলিউম · M = মিউট · F = ফুলস্ক্রিন
            </p>
          </div>

          {images.length > 0 && (
            <>
              <h2>ছবিসমূহ</h2>
              <div className="gallery">
                {images.map((img, i) => (
                  <ImageCard
                    key={img.id}
                    src={img.url}
                    alt={`${batch.name} - ছবি ${i + 1}`}
                    filename={`image-${i + 1}`}
                    onView={() => setOpenIdx(i)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {opened && (
        <div className="lightbox" onClick={() => setOpenIdx(null)}>
          <button className="close" aria-label="বন্ধ করুন">
            ✕
          </button>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div className="frame" style={{ cursor: 'default' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={opened.url} alt={`ছবি ${(openIdx ?? 0) + 1}`} />
            </div>
            <a className="btn-dl" href={downloadHref(opened.url, `image-${(openIdx ?? 0) + 1}`)} download>
              ⬇ ডাউনলোড
            </a>
          </div>
        </div>
      )}
    </>
  )
}