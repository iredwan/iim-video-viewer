import { compressImage } from './image'

export async function uploadImages(files: File[], onProgress: (n: number) => void): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = await compressImage(files[i])
    const fd = new FormData()
    fd.append('image', f)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'আপলোড ব্যর্থ')
    urls.push(json.url)
    onProgress(i + 1)
  }
  return urls
}
