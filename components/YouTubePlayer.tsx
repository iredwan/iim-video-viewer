'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FastForward, Loader2, Maximize, Minimize, Pause, Play, Rewind, Volume2, VolumeX } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null
function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiPromise
}

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) t = 0
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function IconBtn(props: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:bg-white/25 disabled:opacity-40"
    >
      {props.children}
    </button>
  )
}

export default function YouTubePlayer({ videoId }: { videoId: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const seeking = useRef(false)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(100)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [fs, setFs] = useState(false)

  // ভিডিও শেষ হলে প্লেয়ার রিসেট করি
  const finish = useCallback(
    (p: any) => {
      try {
        p.cueVideoById(videoId)
      } catch {}
      setPlaying(false)
      setCur(0)
    },
    [videoId]
  )

  useEffect(() => {
    let cancelled = false
    let player: any
    loadApi().then(() => {
      if (cancelled || !hostRef.current) return
      const el = document.createElement('div')
      hostRef.current.appendChild(el)
      player = new window.YT.Player(el, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            playerRef.current = e.target
            setDur(e.target.getDuration())
            setVol(e.target.getVolume())
            setReady(true)
          },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState
            setPlaying(e.data === S.PLAYING)
            if (e.data === S.PLAYING || e.data === S.PAUSED) setDur(e.target.getDuration())
            if (e.data === S.ENDED) finish(e.target)
          },
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current = null
      try {
        player?.destroy()
      } catch {}
    }
  }, [videoId, finish])

  useEffect(() => {
    if (!ready) return
    const t = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const c = p.getCurrentTime?.() ?? 0
      const d = p.getDuration?.() ?? 0
      if (!seeking.current) setCur(c)
      if (d > 0) {
        setDur(d)
        if (p.getPlayerState() === 1 && d - c < 0.4) finish(p)
      }
    }, 250)
    return () => clearInterval(t)
  }, [ready, finish])

  const toggle = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()
  }, [])

  const seekBy = useCallback((s: number) => {
    const p = playerRef.current
    if (!p) return
    const d = p.getDuration() || 0
    const t = Math.max(0, Math.min(d - 1, p.getCurrentTime() + s))
    p.seekTo(t, true)
    setCur(t)
  }, [])

  const toggleMute = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (p.isMuted()) {
      p.unMute()
      setMuted(false)
    } else {
      p.mute()
      setMuted(true)
    }
  }, [])

  const changeVol = useCallback((v: number) => {
    const p = playerRef.current
    if (!p) return
    const nv = Math.max(0, Math.min(100, v))
    p.setVolume(nv)
    if (nv > 0 && p.isMuted()) {
      p.unMute()
      setMuted(false)
    }
    setVol(nv)
  }, [])

  const changeRate = useCallback((r: number) => {
    playerRef.current?.setPlaybackRate(r)
    setRate(r)
  }, [])

  const toggleFs = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const p = playerRef.current
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          toggle()
          break
        case 'arrowleft':
          e.preventDefault()
          seekBy(-5)
          break
        case 'arrowright':
          e.preventDefault()
          seekBy(5)
          break
        case 'j':
          seekBy(-10)
          break
        case 'l':
          seekBy(10)
          break
        case 'arrowup':
          e.preventDefault()
          changeVol((p?.getVolume() ?? 100) + 5)
          break
        case 'arrowdown':
          e.preventDefault()
          changeVol((p?.getVolume() ?? 100) - 5)
          break
        case 'm':
          toggleMute()
          break
        case 'f':
          toggleFs()
          break
        case '0':
          p?.seekTo(0, true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, toggle, seekBy, changeVol, toggleMute, toggleFs])

  const commitSeek = (v: number) => {
    playerRef.current?.seekTo(v, true)
    seeking.current = false
  }

  // স্ক্রিনের বাম বা ডান পাশে ডাবল ক্লিক হ্যান্ডলার (১০ সেকেন্ড স্কিপ করার জন্য)
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const middle = rect.width / 2

    if (clickX < middle) {
      seekBy(-10) // বামে ডাবল ক্লিক: ১০ সেকেন্ড পেছনে
    } else {
      seekBy(10) // ডানে ডাবল ক্লিক: ১০ সেকেন্ড সামনে
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* ১. ভিডিও ফ্রেম: একদম ক্লিন এবং শুধুমাত্র ভিডিও প্লেয়ার থাকবে */}
      <div
        ref={wrapRef}
        className="relative aspect-[9/16] max-h-dvh w-full overflow-hidden bg-black sm:max-h-none sm:rounded-2xl [&:fullscreen]:aspect-auto [&:fullscreen]:max-h-none [&:fullscreen]:rounded-none"
      >
        <div
          ref={hostRef}
          className="absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
        />

        {/* স্বচ্ছ শিল্ড যা ভিডিওর ওপর ক্লিক ও ডাবল ক্লিক হ্যান্ডেল করবে */}
        <div
          className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center"
          onClick={toggle}
          onDoubleClick={handleDoubleClick}
        >
          {!ready && <Loader2 className="size-8 animate-spin text-white/70" />}
          {ready && !playing && (
            <span className="grid size-16 place-items-center rounded-full bg-black/55 ring-2 ring-white/80 backdrop-blur-sm">
              <Play className="size-8 fill-white text-white" />
            </span>
          )}
        </div>
      </div>

      {/* ২. কন্ট্রোলার ও সিক বার: সম্পূর্ণ ভিডিওর বাইরে নিচের অংশে সাজানো */}
      <div className="mt-3 rounded-xl bg-neutral-900/90 p-3 text-white backdrop-blur-md">
        <input
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={Math.min(cur, dur || 0)}
          aria-label="সিক বার"
          disabled={!ready}
          className="mb-2 block h-2 w-full cursor-pointer accent-blue-500 disabled:opacity-50"
          onChange={(e) => {
            seeking.current = true
            setCur(Number(e.target.value))
          }}
          onPointerUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
        />
        
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <IconBtn onClick={toggle} disabled={!ready} label={playing ? 'পজ' : 'প্লে'}>
              {playing ? <Pause className="size-4 fill-white" /> : <Play className="size-4 fill-white" />}
            </IconBtn>
            <IconBtn onClick={() => seekBy(-10)} disabled={!ready} label="১০ সেকেন্ড পেছনে">
              <Rewind className="size-4" />
            </IconBtn>
            <IconBtn onClick={() => seekBy(10)} disabled={!ready} label="১০ সেকেন্ড সামনে">
              <FastForward className="size-4" />
            </IconBtn>
            <span className="ml-1 text-xs tabular-nums text-white/80">
              {fmt(cur)} / {fmt(dur)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconBtn onClick={toggleMute} disabled={!ready} label="মিউট">
              {muted || vol === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </IconBtn>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : vol}
              aria-label="ভলিউম"
              onChange={(e) => changeVol(Number(e.target.value))}
              className="mr-1 hidden h-1.5 w-16 cursor-pointer accent-blue-500 sm:block"
            />
            <select
              value={rate}
              onChange={(e) => changeRate(Number(e.target.value))}
              disabled={!ready}
              aria-label="স্পিড"
              className="rounded-md bg-white/10 px-1.5 py-1 text-xs font-medium text-white outline-none [&>option]:text-black"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
            <IconBtn onClick={toggleFs} label="ফুলস্ক্রিন">
              {fs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  )
}