// Supabase Edge Function: ImgBB আপলোড প্রক্সি
// ডিপ্লয়: supabase functions deploy imgbb-upload
// কী সেট: supabase secrets set IMGBB_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, prefer',
  'Access-Control-Max-Age': '86400',
}

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'অনুমোদিত নয়' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'অননুমোদিত' }, 401)

    // শুধু লগইন করা অ্যাডমিন আপলোড করতে পারবে
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    )
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return json({ error: 'অননুমোদিত' }, 401)

    const key = Deno.env.get('IMGBB_API_KEY')
    if (!key) return json({ error: 'সার্ভার কনফিগার করা নেই' }, 500)

    const form = await req.formData()
    const f = form.get('image')
    const file = f instanceof File ? f : null
    if (!file) return json({ error: 'ছবি পাওয়া যায়নি' }, 400)
    if (!ALLOWED.includes(file.type)) {
      return json({ error: 'শুধু JPG, PNG, WEBP, GIF সাপোর্টেড' }, 415)
    }
    if (file.size > MAX_BYTES) return json({ error: 'ছবি ৪MB-এর বেশি' }, 413)

    const out = new FormData()
    out.append('image', file)

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body: out,
    })
    const data = await res.json()
    if (!res.ok || !data?.success) return json({ error: 'ImgBB আপলোড ব্যর্থ' }, 502)
    return json({ url: data.data.url as string })
  } catch {
    return json({ error: 'অপ্রত্যাশিত ত্রুটি' }, 500)
  }
})
