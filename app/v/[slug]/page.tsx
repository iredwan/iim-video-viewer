import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import VideoView from '@/components/VideoView'
import { publicClient } from '@/lib/supabase/public'
import { ytThumb } from '@/lib/youtube'
import type { ImageRow } from '@/lib/types'

export const revalidate = 30

// খালি তালিকা: প্রথম ভিজিটে পেজ তৈরি হয়ে ক্যাশ হবে (ISR), তাই প্রতিবার Supabase/ফাংশন চলবে না
export async function generateStaticParams() {
  return []
}

type VideoFull = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  batches: { id: string; name: string } | null
  video_images: ImageRow[]
}

const getVideo = cache(async (slug: string): Promise<VideoFull | null> => {
  if (!/^[a-z0-9]{6,16}$/.test(slug)) return null
  const { data } = await publicClient()
    .from('videos')
    .select('id, slug, youtube_id, title, batches(id, name), video_images(id, url, position)')
    .eq('slug', slug)
    .maybeSingle()
  return (data as unknown as VideoFull) ?? null
})

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const v = await getVideo(slug)
  if (!v) return { title: 'ভিডিও পাওয়া যায়নি' }
  const title = v.title?.trim() || v.batches?.name || 'ভিডিও'
  return { title, openGraph: { title, images: [ytThumb(v.youtube_id)] } }
}

export default async function VideoPage({ params }: Params) {
  const { slug } = await params
  const v = await getVideo(slug)
  if (!v || !v.batches) notFound()
  return (
    <VideoView youtubeId={v.youtube_id} title={v.title} batch={v.batches} images={v.video_images ?? []} />
  )
}
