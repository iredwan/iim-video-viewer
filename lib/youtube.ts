const ID = /^[\w-]{11}$/

export function extractYouTubeId(input: string): string | null {
  const s = input.trim()
  if (ID.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^(www|m)\./, '')
    let id: string | null = null
    if (host === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0]
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else id = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null
    }
    return id && ID.test(id) ? id : null
  } catch {
    return null
  }
}

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
