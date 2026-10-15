'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

  // ভিডিও শেষ হলে (বা শেষের ঠিক আগে) প্লেয়ার রিসেট করি, যাতে YouTube-এর end screen / suggested video না আসে
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

  // সময় আপডেট + শেষ হওয়ার আগেই end screen আটকানো
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

  // কীবোর্ড শর্টকাট
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

  return (
    <div className="player-wrap" ref={wrapRef}>
      <div className="player-box">
        <div ref={hostRef} className="player-host" />
        {/* YouTube UI-তে ক্লিক আটকাতে স্বচ্ছ শিল্ড: শুধু আমাদের কন্ট্রোল কাজ করবে */}
        <div className="player-shield" onClick={toggle}>
          {ready && !playing && (
            <button className="big-play" aria-label="চালু করুন">
              ▶
            </button>
          )}
          {!ready && <span className="loading">লোড হচ্ছে…</span>}
        </div>
      </div>

      <div className="controls">
        <input
          className="seek"
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={Math.min(cur, dur || 0)}
          aria-label="সিক বার"
          disabled={!ready}
          onChange={(e) => {
            seeking.current = true
            setCur(Number(e.target.value))
          }}
          onPointerUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
        />
        <div className="ctrl-row">
          <button onClick={toggle} disabled={!ready} aria-label={playing ? 'পজ' : 'প্লে'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => seekBy(-10)} disabled={!ready} aria-label="১০ সেকেন্ড পেছনে">
            ⟲ 10
          </button>
          <button onClick={() => seekBy(10)} disabled={!ready} aria-label="১০ সেকেন্ড সামনে">
            10 ⟳
          </button>
          <span className="time">
            {fmt(cur)} / {fmt(dur)}
          </span>
          <span className="spacer" />
          <button onClick={toggleMute} disabled={!ready} aria-label="মিউট">
            {muted || vol === 0 ? '🔇' : '🔊'}
          </button>
          <input
            className="vol"
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : vol}
            aria-label="ভলিউম"
            onChange={(e) => changeVol(Number(e.target.value))}
          />
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            aria-label="স্পিড"
            disabled={!ready}
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
          <button onClick={toggleFs} aria-label="ফুলস্ক্রিন">
            {fs ? '🡼' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  )
}
