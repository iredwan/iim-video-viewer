import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// ImgBB-র ছবি ক্রস-অরিজিন হওয়ায় সরাসরি <a download> কাজ করে না,
// তাই সার্ভার ছবিটি এনে "attachment" হিসেবে পাঠায়। শুধু ibb.co হোস্ট অনুমোদিত (SSRF প্রতিরোধ)।
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = (searchParams.get('name') ?? 'image').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'image'

  let target: URL
  try {
    target = new URL(searchParams.get('url') ?? '')
  } catch {
    return NextResponse.json({ error: 'ভুল লিংক' }, { status: 400 })
  }
  const host = target.hostname
  if (target.protocol !== 'https:' || !(host === 'ibb.co' || host.endsWith('.ibb.co'))) {
    return NextResponse.json({ error: 'অনুমোদিত নয়' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(target, { redirect: 'error' })
  } catch {
    return NextResponse.json({ error: 'ছবি আনা যায়নি' }, { status: 502 })
  }

  const type = upstream.headers.get('content-type')?.split(';')[0] ?? ''
  if (!upstream.ok || !upstream.body || !type.startsWith('image/')) {
    return NextResponse.json({ error: 'ছবি আনা যায়নি' }, { status: 502 })
  }

  const headers = new Headers({
    'Content-Type': type,
    'Content-Disposition': `attachment; filename="${name}.${EXT[type] ?? 'jpg'}"`,
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)

  return new Response(upstream.body, { headers })
}