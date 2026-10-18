import { compressImage } from './image'
import { functionsBase } from './urls'

export async function uploadImages(files: File[], onProgress: (n: number) => void): Promise<string[]> {
  const { createClient } = await import('./supabase/client')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('আপলোডের জন্য লগইন করুন')

  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = await compressImage(files[i])
    const fd = new FormData()
    fd.append('image', f)
    const res = await fetch(`${functionsBase}/imgbb-upload`, {
      method: 'POST',
      body: fd,
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'আপলোড ব্যর্থ')
    urls.push(json.url)
    onProgress(i + 1)
  }
  return urls
}
