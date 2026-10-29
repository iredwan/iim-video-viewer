'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Pencil } from 'lucide-react'
import { ytThumb } from '@/lib/youtube'
import { iconBtn } from '@/lib/ui'
import EditVideoModal from './EditVideoModal'
import type { AdminVideoRow } from '@/lib/types'

type Props = { video: AdminVideoRow; onChange: () => Promise<void> }

export default function AdminVideoItem({ video, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const images = [...(video.video_images ?? [])]
  const path = `/v/${video.slug}`
  const pathWithKey = `${path}?key=${encodeURIComponent(video.access_key)}`

  // গ্রুপে শেয়ার করার লিংক: ওই ভিডিওতে সরাসরি খোলে, ব্যাক করলে ১..এই ক্লাস পর্যন্ত খোলা
  async function copy() {
    const share = `${window.location.origin}${pathWithKey}`
    try {
      await navigator.clipboard.writeText(share)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('শেয়ার লিংক কপি করুন', share)
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <img src={ytThumb(video.youtube_id)} alt="" className="aspect-video w-40 shrink-0 rounded-md bg-black object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            <span className="text-blue-400">ক্লাস {video.class_no}</span>
            {video.title?.trim() ? ` — ${video.title.trim()}` : ''}
          </p>
          <p className="truncate text-xs text-neutral-400">{path}</p>
          <p className="text-xs text-neutral-500">{images.length} টি ছবি</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={copy} className={iconBtn} aria-label="শেয়ার লিংক কপি" title="গ্রুপের শেয়ার লিংক কপি">
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          </button>
          <a href={pathWithKey} target="_blank" rel="noreferrer" className={iconBtn} aria-label="খুলুন" title="খুলুন">
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={iconBtn}
            aria-label="এডিট"
            title="এডিট"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      {editing && <EditVideoModal video={video} onClose={() => setEditing(false)} onChange={onChange} />}
    </li>
  )
}
