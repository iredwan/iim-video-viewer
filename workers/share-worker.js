// Cloudflare Worker: শেয়ার লিংকের OG প্রিভিউ সার্ভার (মেসেঞ্জার-ফ্রেন্ডলি)
// রুট: /v/<slug>   → ক্রলারকে OG HTML, মানুষকে আসল পেজে রিডাইরেক্ট
// রুট: /img/<id>.jpg → ইউটিউব থাম্বনেইল প্রক্সি (একই ডোমেইন থেকে ছবি)

const SITE_NAME = 'ইক্বরা ইসলামিক মাদরাসা'
const DESCRIPTION = 'সহীহ শুদ্ধভাবে কুরআন শিক্ষা কোর্স — শুধুমাত্র নারীদের জন্য'

const SLUG_ROUTE = /^\/v\/([a-z0-9]{6,16})\/?$/
const IMG_ROUTE = /^\/img\/([A-Za-z0-9_-]{11})\.jpg$/

const CRAWLER_RE =
  /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|facebookcatalog|messenger|whatsapp|instagram|telegrambot|twitterbot|discordbot|slackbot|linkedinbot|pinterest|skypeuripreview|applebot|opengraph|bot|crawler|spider|node-fetch/i

function isCrawler(ua) {
  return !!ua && CRAWLER_RE.test(ua)
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml({ title, image, target, selfUrl, fbAppId }) {
  const fbApp = fbAppId ? `<meta property="fb:app_id" content="${esc(fbAppId)}">` : ''
  const imgTags = image
    ? `<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">`
    : `<meta name="twitter:card" content="summary">`

  return `<!doctype html>
<html lang="bn" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="canonical" href="${esc(selfUrl)}">
${fbApp}
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:locale" content="bn_BD">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:url" content="${esc(selfUrl)}">
${imgTags}
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(DESCRIPTION)}">
</head>
<body>
<p><a href="${esc(target)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body>
</html>`
}

function htmlResponse(html, cacheable) {
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': cacheable ? 'public, max-age=300' : 'no-store',
      vary: 'User-Agent',
    },
  })
}

// ইউটিউব থাম্বনেইল প্রক্সি: বাফার করে পাঠানো হয় যাতে content-length থাকে
async function serveImage(id, url, ctx) {
  const cache = caches.default
  const cacheKey = new Request(`${url.origin}/img/${id}.jpg`)

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  for (const name of ['maxresdefault', 'sddefault', 'hqdefault']) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`, {
        signal: AbortSignal.timeout(4000),
        cf: { cacheTtl: 86400, cacheEverything: true },
      })
      if (!r.ok) continue
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 2000) continue // প্লেসহোল্ডার/ভাঙা ছবি বাদ

      const resp = new Response(buf, {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': String(buf.byteLength),
          'cache-control': 'public, max-age=86400',
          'access-control-allow-origin': '*',
        },
      })
      ctx.waitUntil(cache.put(cacheKey, resp.clone()))
      return resp
    } catch {
      // পরের সাইজ চেষ্টা করুন
    }
  }
  return new Response('not found', { status: 404, headers: { 'cache-control': 'no-store' } })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const site = (env.SITE_URL || 'https://web.app').replace(/\/+$/, '')

    // ১) ছবি প্রক্সি
    const im = url.pathname.match(IMG_ROUTE)
    if (im) return serveImage(im[1], url, ctx)

    // ২) শেয়ার লিংক
    const m = url.pathname.match(SLUG_ROUTE)
    if (!m) return Response.redirect(site + url.pathname + url.search, 302)

    const slug = m[1]
    const target = `${site}/v/${slug}`
    const selfUrl = `${url.origin}/v/${slug}`
    const ua = request.headers.get('user-agent') || ''

    // মানুষ → সরাসরি আসল পেজে (key সহ পুরো কুয়েরি প্রিজার্ভ — নইলে ভিডিও খুলবে না)
    if (!isCrawler(ua)) return Response.redirect(target + url.search, 302)

    // ক্রলারের জন্য ক্যাশ করা HTML থাকলে সাথে সাথে দিন
    const cache = caches.default
    const htmlKey = new Request(`${url.origin}/__og/${slug}`)
    const cached = await cache.match(htmlKey)
    if (cached) return cached

    const fbAppId = env.FB_APP_ID || ''
    const fallbackImage = env.FALLBACK_IMAGE || ''

    try {
      // ব্যাচ সিস্টেম বাদ ও videos-এ anon select বন্ধ → পাবলিক RPC দিয়ে (title/class_no/youtube_id)
      const api = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/get_public_og`

      const r = await fetch(api, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_slug: slug }),
        signal: AbortSignal.timeout(4000),
      })

      // Supabase সমস্যা (পজ/এরর) → রিডাইরেক্ট নয়, জেনেরিক প্রিভিউ
      if (!r.ok) {
        return htmlResponse(
          buildHtml({ title: SITE_NAME, image: fallbackImage, target, selfUrl, fbAppId }),
          false
        )
      }

      const v = await r.json()
      if (!v || !v.youtube_id) return Response.redirect(target + url.search, 302)

      const title = `${v.class_no ? `ক্লাস ${v.class_no} — ` : ''}${(v.title || '').trim() || 'ভিডিও'} | ${SITE_NAME}`
      const image = `${url.origin}/img/${v.youtube_id}.jpg`

      const resp = htmlResponse(buildHtml({ title, image, target, selfUrl, fbAppId }), true)
      ctx.waitUntil(cache.put(htmlKey, resp.clone()))
      return resp
    } catch {
      return htmlResponse(
        buildHtml({ title: SITE_NAME, image: fallbackImage, target, selfUrl, fbAppId }),
        false
      )
    }
  },
}