'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { btnPrimary } from '@/lib/ui'

type Props = { path: string; title: string; variant?: 'icon' | 'full' | 'ghost' }

export default function ShareButton({ path, title, variant = 'full' }: Props) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}${path}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('লিংক কপি করুন', url)
    }
  }

  const Icon = copied ? Check : Share2

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={share}
        aria-label="শেয়ার করুন"
        title="শেয়ার করুন"
        className="inline-flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
      >
        <Icon className="size-5" />
      </button>
    )
  }
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        onClick={share}
        aria-label="শেয়ার করুন"
        title="শেয়ার করুন"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-200 transition hover:bg-white/10"
      >
        <Icon className="size-5" />
      </button>
    )
  }
  return (
    <button type="button" onClick={share} className={`${btnPrimary} flex-1`}>
      <Icon className="size-4" />
      {copied ? 'লিংক কপি হয়েছে' : 'ভিডিও শেয়ার করুন'}
    </button>
  )
}
