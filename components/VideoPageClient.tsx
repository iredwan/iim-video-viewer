'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import VideoView from '@/components/VideoView'
import { createClient } from '@/lib/supabase/client'
import type { ImageRow } from '@/lib/types'

type PublicVideoFull = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  class_no: number
  images: { image_id: string; image_url: string }[] | null
}

function getSlug(pathname: string, params: URLSearchParams) {
  const seg = pathname.replace(/^\/v\/?/, '').split('/')[0]
  return params.get('id') || (seg && seg !== '' ? seg : '')
}

function VideoClientInner() {
  const pathname = usePathname()
  const params = useSearchParams()
  const [video, setVideo] = useState<PublicVideoFull | null | 'error'>(null)

  const slug = getSlug(pathname, params)
  const key = params.get('key') ?? ''
  const unlockParam = params.get('unlock') ?? params.get('class')
  const unlock = unlockParam ? Number(unlockParam) : 0
  const hasUnlock = Boolean(unlockParam) && Number.isInteger(unlock) && unlock >= 1 && key.trim() !== ''
  const hasOwnKey = key.trim() !== ''

  useEffect(() => {
    if (!/^[a-z0-9]{6,16}$/.test(slug) || (!hasUnlock && !hasOwnKey)) {
      setVideo('error')
      return
    }
    let alive = true
    createClient()
      .rpc(
        hasUnlock ? 'get_public_unlocked_video' : 'get_public_video',
        hasUnlock
          ? { p_class: unlock, p_key: key, p_slug: slug }
          : { p_slug: slug, p_key: key }
      )
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setVideo('error')
        else setVideo((data as unknown as PublicVideoFull | null) ?? 'error')
      })
    return () => {
      alive = false
    }
  }, [slug, key, hasUnlock, unlock])

  useEffect(() => {
    if (video && video !== 'error') {
      document.title = `ক্লাস ${video.class_no} — ${video.title?.trim() || 'ক্লাস রেকডিং'} | ইক্বরা ইসলামিক মাদরাসা`
    }
  }, [video])

  const images: ImageRow[] = useMemo(
    () =>
      (video && video !== 'error' ? (video.images ?? []) : [])
        .map((im, i) => ({ id: im.image_id ?? String(i), url: im.image_url ?? '', position: i }))
        .filter((im) => im.url),
    [video]
  )

  // back বাটনের unlock সীমা: unlock-লিংকে খুললে ঐ সীমা; নিজস্ব পাসওয়ার্ডে খুললে ওই ভিডিওর ক্লাস
  const maxUnlocked = video && video !== 'error' ? (hasUnlock ? Math.min(unlock, Math.max(unlock, video.class_no)) : video.class_no) : 0

  if (!video) {
    return <div className="mx-auto mt-10 aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-neutral-800" />
  }

  if (video === 'error') {
    return <p className="py-16 text-center text-neutral-400">ভিডিও পাওয়া যায়নি। গ্রুপ থেকে পাওয়া লিংকে ফিরে যান।</p>
  }

  return (
    <VideoView
      youtubeId={video.youtube_id}
      title={video.title}
      classNo={video.class_no}
      maxUnlocked={maxUnlocked}
      userKey={key}
      images={images}
    />
  )
}

// export সীমানায় Suspense — useSearchParams স্ট্যাটিক প্রিবিল্ডে নিরাপদ
export default function VideoPageClient() {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-neutral-800" />}>
      <VideoClientInner />
    </Suspense>
  )
}
