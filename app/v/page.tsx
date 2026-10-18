'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import VideoView from '@/components/VideoView'
import { createClient } from '@/lib/supabase/client'
import type { ImageRow } from '@/lib/types'

type VideoFull = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  batches: { id: string; name: string } | null
  video_images: ImageRow[]
}

function getSlug(pathname: string, params: URLSearchParams) {
  const seg = pathname.replace(/^\/v\/?/, '').split('/')[0]
  return params.get('id') || (seg && seg !== '' ? seg : '')
}

function VideoClient() {
  const pathname = usePathname()
  const params = useSearchParams()
  const [video, setVideo] = useState<VideoFull | null | 'error'>(null)

  const slug = getSlug(pathname, params)

  useEffect(() => {
    if (!/^[a-z0-9]{6,16}$/.test(slug)) {
      setVideo('error')
      return
    }
    let alive = true
    createClient()
      .from('videos')
      .select('id, slug, youtube_id, title, batches(id, name), video_images(id, url, position)')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setVideo((data as unknown as VideoFull) ?? 'error')
      })
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    if (video && video !== 'error') {
      document.title = `${video.title?.trim() || video.batches?.name || 'ভিডিও'} — ইক্বরা ইসলামিক মাদরাসা`
    }
  }, [video])

  if (!video) {
    return <div className="mx-auto mt-10 aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-neutral-800" />
  }

  if (video === 'error' || !video.batches) {
    return <p className="py-16 text-center text-neutral-400">ভিডিও পাওয়া যায়নি।</p>
  }

  return (
    <VideoView
      youtubeId={video.youtube_id}
      title={video.title}
      batch={video.batches}
      images={video.video_images ?? []}
    />
  )
}

export default function VideoPage() {
  return (
    <Suspense>
      <VideoClient />
    </Suspense>
  )
}
