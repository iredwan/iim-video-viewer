// Cloudflare Worker: শেয়ার লিংকের OG প্রিভিউ সার্ভার
// রুট: /v/<slug>
//   মানুষ (ক্লিক)          → ৩০২ রিডাইরেক্ট, সরাসরি মূল সাইটের ভিডিও পেজে
//   শেয়ার-ক্রলার (OG পড়তে আসে) → ২০০ + শুধু OG মেটা (থাম্বনেইল + টাইটেল)
// অন্য সব পাথ মূল সাইটে রিডাইরেক্ট
// Deploy: Cloudflare Dashboard → Workers → Create → এই কোড পেস্ট → ভেরিয়েবল সেট:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL (ঐচ্ছিক, ডিফল্ট iim-recording-class.web.app)

const SLUG_RE = /^[a-z0-9]{6,16}$/

// রিয়েল ব্রাউজার (in-app সহ) প্রায় সবার UA-তে Mozilla থাকে;
// শেয়ার-প্রিভিউ ক্রলাররা নিজস্ব টোকেন নিয়ে আসে
function isCrawler(ua) {
  if (!ua) return false
  if (/facebookexternalhit/i.test(ua)) return true
  if (/WhatsApp/i.test(ua) && !/Mozilla/i.test(ua)) return true
  return /telegrambot|twitterbot|discordbot|slackbot|linkedinbot|applebot/i.test(ua)
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// শুধু ক্রলারের জন্য — কোনো refresh/redirect নেই, নাহলে FB og:url ফলো করে অন্য পেজের OG নেয়
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
</head>
<body>
<p><a href="${esc(target)}">${esc(title)}</a></p>
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
    const ua = request.headers.get('user-agent') || ''

    // মানুষ → সরাসরি আসল পেজ (in-app ব্রাউজারে মাঝের পেজ কখনো দেখা যাবে না)
    if (!isCrawler(ua)) return Response.redirect(`${site}/v/${slug}`, 302)

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
