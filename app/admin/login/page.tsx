'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { btnPrimary, inputCls } from '@/lib/ui'

export default function Login() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('ইমেইল বা পাসওয়ার্ড ভুল')
      setBusy(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-6 text-center text-2xl font-bold">অ্যাডমিন লগইন</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900 p-5">
        <label className="block space-y-1.5 text-sm text-neutral-400">
          ইমেইল
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block space-y-1.5 text-sm text-neutral-400">
          পাসওয়ার্ড
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {busy ? 'অপেক্ষা করুন…' : 'লগইন'}
        </button>
      </form>
    </main>
  )
}
