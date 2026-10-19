'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Pencil } from 'lucide-react'
import { ytThumb } from '@/lib/youtube'
import { ogShareUrl } from '@/lib/urls'
import { iconBtn } from '@/lib/ui'
import EditVideoModal from './EditVideoModal'
import type { VideoRow } from '@/lib/types'

type Props = { video: VideoRow; index: number; onChange: () => Promise<void> }

export default function AdminVideoItem({ video, index, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const images = [...(video.video_images ?? [])]
  const path = `/v/${video.slug}`
  // শেয়ার লিংক — OG প্রিভিউ (থাম্বনেইল + টাইটেল) দেখায়, খুললে আসল পেজে যায়
  // NEXT_PUBLIC_SHARE_BASE = Cloudflare Worker-এর ঠিকানা (যেমন https://share-og.example.workers.dev)
  const shareBase = (process.env.NEXT_PUBLIC_SHARE_BASE ?? '').replace(/\/+$/, '')
  const shareUrl = shareBase ? `${shareBase}/v/${video.slug}` : ogShareUrl(video.slug)

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('শেয়ার লিংক কপি করুন', shareUrl)
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ytThumb(video.youtube_id)} alt="" className="aspect-video w-40 shrink-0 rounded-md bg-black object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{video.title?.trim() || `ভিডিও ${index + 1}`}</p>
          <p className="truncate text-xs text-neutral-400">{path}</p>
          <p className="text-xs text-neutral-500">{images.length} টি ছবি</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={copy} className={iconBtn} aria-label="শেয়ার লিংক কপি" title="শেয়ার লিংক কপি">
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          </button>
          <a href={path} target="_blank" rel="noreferrer" className={iconBtn} aria-label="খুলুন" title="খুলুন">
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

      {editing && (
        <EditVideoModal video={video} index={index} onClose={() => setEditing(false)} onChange={onChange} />
      )}
    </li>
  )
}
