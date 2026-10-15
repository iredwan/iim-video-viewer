export type ImageRow = { id: string; url: string; position: number }
export type VideoRow = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  created_at: string
  video_images?: ImageRow[]
}
export type BatchRow = { id: string; name: string; videos: VideoRow[] }
