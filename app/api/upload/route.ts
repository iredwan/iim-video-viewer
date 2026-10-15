import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'অননুমোদিত' }, { status: 401 })

  const key = process.env.IMGBB_API_KEY
  if (!key) return NextResponse.json({ error: 'সার্ভার কনফিগার করা নেই' }, { status: 500 })

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get('image')
    file = f instanceof File ? f : null
  } catch {
    return NextResponse.json({ error: 'ভুল রিকোয়েস্ট' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'ছবি পাওয়া যায়নি' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'শুধু JPG, PNG, WEBP, GIF সাপোর্টেড' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'ছবি ৪MB-এর বেশি' }, { status: 413 })
  }

  const body = new FormData()
  body.append('image', file)

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body,
    })
    const json = await res.json()
    if (!res.ok || !json?.success) {
      return NextResponse.json({ error: 'ImgBB আপলোড ব্যর্থ' }, { status: 502 })
    }
    return NextResponse.json({ url: json.data.url as string })
  } catch {
    return NextResponse.json({ error: 'ImgBB-তে সংযোগ করা যায়নি' }, { status: 502 })
  }
}
