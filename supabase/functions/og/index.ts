// Supabase Edge Function: /functions/v1/og?slug=<video-slug>
// সোশ্যাল ক্রলারের জন্য ভিডিওর OG ট্যাগ (টাইটেল + ইউটিউব থাম্বনেইল) দেয়,
// মানুষকে সাথে সাথে আসল পেজে রিডাইরেক্ট করে।
// ডিপ্লয়: supabase functions deploy og --no-verify-jwt
// (ক্রলার লগইন ছাড়া আসে, তাইনো-ভেরিফাই জরুরি)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE = Deno.env.get('SITE_URL') ?? 'https://iim-recording-class.web.app'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function htmlPage(title: string, image: string, target: string, status = 200) {
  const html = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="ইক্বরা ইসলামিক মাদরাসা — ক্লাস রেকডিং">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta property="og:url" content="${esc(target)}">
<meta property="og:type" content="video.other">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head>
<body style="background:#0a0a0a;color:#e5e5e5;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center">
<p><a href="${esc(target)}" style="color:#38bdf8">ক্লাস রেকডিং দেখুন →</a></p>
</body>
</html>`
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      // Supabase গেটওয়ের ডিফল্ট "CSP: sandbox" রেসপন্সকে text/plain বানিয়ে FB/WhatsApp-এর OG ভেঙে দেয়;
      // নিজের CSP (sandbox ছাড়া) সেট করলে সেটা ওভাররাইড হয়
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src *",
    },
  })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  if (!/^[a-z0-9]{6,16}$/.test(slug)) {
    return htmlPage('ভিডিও পাওয়া যায়নি | ইক্বরা ইসলামিক মাদরাসা', `${SITE}/assets/logo/logo.png`, SITE, 404)
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
    })
    // সরাসরি টেবিল নয় — anon-এর জন্য নির্ধারিত RPC দিয়ে (videos-এ anon select বন্ধ)
    const { data: v } = await supabase.rpc('get_public_og', { p_slug: slug })

    if (!v) {
      return htmlPage('ভিডিও পাওয়া যায়নি | ইক্বরা ইসলামিক মাদরাসা', `${SITE}/assets/logo/logo.png`, SITE, 404)
    }

    const vData = v as { title?: string | null; class_no?: number | null; youtube_id: string }
    const title = `${vData.class_no ? `ক্লাস ${vData.class_no} — ` : ''}${vData.title?.trim() || 'ভিডিও'} | ইক্বরা ইসলামিক মাদরাসা`
    const image = `https://i.ytimg.com/vi/${vData.youtube_id}/hqdefault.jpg`
    return htmlPage(title, image, `${SITE}/v/${slug}`)
  } catch {
    return htmlPage('ইক্বরা ইসলামিক মাদরাসা', `${SITE}/assets/logo/logo.png`, SITE, 500)
  }
})
