'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    <main className="container narrow">
      <h1>অ্যাডমিন লগইন</h1>
      <form onSubmit={submit} className="card stack">
        <label>
          ইমেইল
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          পাসওয়ার্ড
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'অপেক্ষা করুন…' : 'লগইন'}
        </button>
      </form>
    </main>
  )
}
