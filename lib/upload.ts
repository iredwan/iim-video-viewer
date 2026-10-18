import { compressImage } from './image'

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/imgbb-upload`

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
    const res = await fetch(FN_URL, {
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
