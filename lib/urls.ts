// NEXT_PUBLIC_SUPABASE_URL-এর শেষে ভুলে / থেকে গেলে বানানো ফাংশন লিংক //functions হয়ে ভেঙে যায়
const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')

export const functionsBase = `${base}/functions/v1`

export function ogShareUrl(slug: string) {
  return `${functionsBase}/og?slug=${encodeURIComponent(slug)}`
}
