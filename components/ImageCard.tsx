'use client'

export function downloadHref(url: string, filename: string) {
  return `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`
}

type Props = { src: string; alt: string; filename: string; onView: () => void }

export default function ImageCard({ src, alt, filename, onView }: Props) {
  return (
    <div className="img-card">
      <button type="button" className="frame" onClick={onView} aria-label="ছবি দেখুন">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" />
      </button>
      <div className="img-actions">
        <button type="button" className="btn-view" onClick={onView}>
          👁 ভিউ
        </button>
        <a className="btn-dl" href={downloadHref(src, filename)} download>
          ⬇ ডাউনলোড
        </a>
      </div>
    </div>
  )
}