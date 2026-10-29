export type LibraryImage = {
  id: string
  url: string
  path: string | null
  byte_size: number | null
  created_at?: string
}

// ভিডিও ↔ ছবি লিংক (এক ছবি একাধিক ভিডিওতে থাকতে পারে) — অ্যাডমিন কায়ারিতে
export type VideoImageLink = {
  id: string
  image_id: string
  position: number
  images: LibraryImage | null
}

// ডিসপ্লে-বান্ধব সমতল রূপ
export type ImageRow = { id: string; url: string; position: number }

// অ্যাডমিন কুয়েরির সারি (access_key সহ)
export type AdminVideoRow = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  class_no: number
  access_key: string
  created_at: string
  video_images?: VideoImageLink[]
}

// পাবলিক RPC থেকে ফেরা প্রতি-ব্যাচ/ক্লাসের ভিডিও
export type PublicVideo = {
  id: string
  slug: string
  youtube_id: string
  title: string | null
  class_no: number
}
