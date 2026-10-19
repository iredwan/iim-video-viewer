// Cloudflare Worker: শেয়ার লিংকের OG প্রিভিউ সার্ভার
// রুট: /v/<slug>  → ক্রলারকে OG (টাইটেল + ইউটিউব থাম্বনেইল), মানুষকে মূল সাইটে রিডাইরেক্ট
// অন্য সব পাথ মূল সাইটে রিডাইরেক্ট
// Deploy: Cloudflare Dashboard → Workers → Create → এই কোড পেস্ট → ভেরিয়েবল সেট:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL (ঐচ্ছিক, ডিফল্ট iim-recording-class.web.app)

const SLUG_RE = /^[a-z0-9]{6,16}$/

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function htmlPage(title, image, target) {
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
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const site = (env.SITE_URL || 'https://iim-recording-class.web.app').replace(/\/+$/, '')
    const m = url.pathname.match(/^\/v\/([a-z0-9]{6,16})\/?$/)

    if (!m) return Response.redirect(site + url.pathname + url.search, 302)

    const slug = m[1]
    try {
      const r = await fetch(
        `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/videos?slug=eq.${encodeURIComponent(slug)}&select=youtube_id,title,batches(name)`,
        { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
      )
      const rows = await r.json()
      const v = Array.isArray(rows) ? rows[0] : null
      if (!v) return Response.redirect(`${site}/v/${slug}`, 302)

      const title = `${v.title?.trim() || v.batches?.name || 'ভিডিও'} | ইক্বরা ইসলামিক মাদরাসা`
      const img = `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`
      return htmlPage(title, img, `${site}/v/${slug}`)
    } catch {
      return Response.redirect(`${site}/v/${slug}`, 302)
    }
  },
}
