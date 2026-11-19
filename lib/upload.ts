import type { SupabaseClient } from '@supabase/supabase-js'
import { compressImage } from './image'
import type { LibraryImage } from './types'

const BUCKET = 'class-images'

// ব্রাউজারেই কুয়ালিটি ঠিক রেখে কম্প্রেস (২০০০px, JPEG q=0.85) → স্টোরেজে নামানো → লাইব্রেরিতে রেজিস্টার
export async function uploadToLibrary(files: File[], onProgress: (n: number) => void): Promise<LibraryImage[]> {
  const { createClient } = await import('./supabase/client')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('আপলোডের জন্য লগইন করুন')

  const rows: LibraryImage[] = []
  for (let i = 0; i < files.length; i++) {
    const f = await compressImage(files[i])

    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `images/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, f, { contentType: f.type || 'image/jpeg', upsert: false })
    if (upErr) throw new Error(upErr.message)

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const { data: row, error: rowErr } = await supabase
      .from('images')
      .insert({ url: pub.publicUrl, path, byte_size: f.size })
      .select()
      .single()
    if (rowErr) throw new Error(rowErr.message)

    rows.push(row as LibraryImage)
    onProgress(i + 1)
  }
  return rows
}

// লাইব্রেরির একটি ছবি নতুন ফাইল দিয়ে বদলানো: একই রেকর্ড আপডেট হয় (ভিডিও-লিংক/পজিশন অটো থাকে),
// আর পুরনো ছবিটি স্টোরেজ থেকেও পুরোপুরি মুছে ফেলা হয়
export async function replaceLibraryImage(
  supabase: SupabaseClient,
  target: { imageId: string; path: string | null },
  file: File
): Promise<LibraryImage> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('ছবি বদলানোর জন্য লগইন করুন')

  const f = await compressImage(file)
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
  const newPath = `images/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, f, { contentType: f.type || 'image/jpeg', upsert: false })
  if (upErr) throw new Error(upErr.message)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

  const { data: row, error: rowErr } = await supabase
    .from('images')
    .update({ url: pub.publicUrl, path: newPath, byte_size: f.size })
    .eq('id', target.imageId)
    .select()
    .single()
  if (rowErr) {
    // রেকর্ড আপডেট হতে না পারলে নতুন আপলোড হওয়া ফাইলটি সরিয়ে দিই
    await supabase.storage.from(BUCKET).remove([newPath])
    throw new Error(rowErr.message)
  }

  // পুরনো ছবিটি স্টোরেজ থেকেও পুরোপুরি মুছে ফেলা
  if (target.path) {
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([target.path])
    if (delErr) throw new Error(delErr.message)
  }
  return row as LibraryImage
}
