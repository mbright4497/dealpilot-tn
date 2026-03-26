'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface DocumentAirDropProps {
  isVisible: boolean
  documentName: string
  /** When extraction finishes, drive success sequence before hiding. */
  status?: 'processing' | 'uploaded' | 'reviewed' | 'error'
  onComplete?: () => void
}

const PROGRESS = ['Extracting fields...', 'Running broker review...', 'Updating your deal...'] as const

const REVA_AVATAR = '/avatar-pilot.png'

/** Total celebrate sequence before onComplete (jet 2.5s + pause 0.5s + Reva fade 0.8s + buffer). */
const CELEBRATE_TOTAL_MS = 4000

function F16JetSvg() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden className="drop-shadow-lg">
      <defs>
        <linearGradient id="f16Body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d3d52" />
          <stop offset="100%" stopColor="#1a1a28" />
        </linearGradient>
        <linearGradient id="f16Stripe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="afterburnCore" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <filter id="burnGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Afterburner plume */}
      <g filter="url(#burnGlow)" style={{ animation: 'afterburnPulse 0.45s ease-in-out infinite' }}>
        <ellipse cx="-14" cy="40" rx="22" ry="10" fill="url(#afterburnCore)" opacity="0.95" />
        <ellipse cx="-28" cy="40" rx="14" ry="6" fill="#fbbf24" opacity="0.85" />
      </g>
      {/* Fuselage */}
      <path
        d="M 4 40 L 28 32 L 88 30 L 108 38 L 108 42 L 88 50 L 28 48 Z"
        fill="url(#f16Body)"
        stroke="#1e1e2e"
        strokeWidth="0.8"
      />
      {/* Orange accent stripe */}
      <path d="M 32 38 L 82 36 L 84 40 L 32 42 Z" fill="url(#f16Stripe)" opacity="0.9" />
      {/* Nose cone */}
      <path d="M 88 30 L 112 38 L 112 42 L 88 50 Z" fill="#2a2a3e" stroke="#1a1a24" strokeWidth="0.6" />
      {/* Cockpit canopy */}
      <ellipse cx="72" cy="36" rx="10" ry="5" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
      <ellipse cx="73" cy="35" rx="6" ry="3" fill="#38bdf8" opacity="0.35" />
      {/* Intake */}
      <path d="M 38 44 L 52 46 L 52 50 L 36 48 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.4" />
      <ellipse cx="42" cy="47" rx="3" ry="2" fill="#0c1220" />
      {/* Delta / swept main wing */}
      <path d="M 44 48 L 18 62 L 8 58 L 36 46 Z" fill="#2a2a3e" stroke="#1e1e2e" strokeWidth="0.6" />
      <path d="M 44 48 L 70 56 L 58 62 L 40 50 Z" fill="#32324a" stroke="#1e1e2e" strokeWidth="0.5" />
      {/* Horizontal stabilizers */}
      <path d="M 12 38 L 4 34 L 8 32 L 18 36 Z" fill="#2f2f44" />
      <path d="M 12 42 L 4 46 L 8 48 L 18 44 Z" fill="#2f2f44" />
      {/* Vertical tail */}
      <path d="M 14 36 L 8 22 L 12 20 L 20 34 Z" fill="#2a2a3e" stroke="#1a1a28" strokeWidth="0.5" />
      {/* Wing fences / detail */}
      <line x1="30" y1="52" x2="34" y2="56" stroke="#475569" strokeWidth="0.8" opacity="0.6" />
    </svg>
  )
}

export default function DocumentAirDrop({
  isVisible,
  documentName,
  status = 'processing',
  onComplete,
}: DocumentAirDropProps) {
  const [progressIdx, setProgressIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'run' | 'celebrate' | 'exit'>('idle')
  const [dots, setDots] = useState('')
  const successStarted = useRef(false)

  useEffect(() => {
    if (!isVisible) {
      setPhase('idle')
      successStarted.current = false
      return
    }
    setPhase('run')
  }, [isVisible])

  useEffect(() => {
    if (phase !== 'run' || !isVisible) return
    const t = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS.length)
    }, 2200)
    return () => clearInterval(t)
  }, [phase, isVisible])

  useEffect(() => {
    if (phase !== 'run' || !isVisible) return
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => clearInterval(t)
  }, [phase, isVisible])

  useEffect(() => {
    if (!isVisible || status !== 'reviewed') return
    if (successStarted.current) return
    if (phase !== 'run') return
    successStarted.current = true
    setPhase('celebrate')
    const t = setTimeout(() => {
      setPhase('exit')
      onComplete?.()
    }, CELEBRATE_TOTAL_MS)
    return () => clearTimeout(t)
  }, [isVisible, status, phase, onComplete])

  useEffect(() => {
    if (!isVisible || status !== 'error') return
    setPhase('exit')
    const t = setTimeout(() => onComplete?.(), 400)
    return () => clearTimeout(t)
  }, [isVisible, status, onComplete])

  const progressText = useMemo(() => PROGRESS[progressIdx], [progressIdx])

  if (!isVisible && phase === 'idle') return null

  const showCelebrate = phase === 'celebrate' || phase === 'exit'
  const showWorking = phase === 'run'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 text-white"
      aria-live="polite"
      aria-busy={!showCelebrate}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes afterburnPulse {
  0%, 100% { opacity: 0.85; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.25); }
}
@keyframes f16Cross {
  0% { transform: translate(-45vw, 8px) rotate(-6deg); }
  45% { transform: translate(8vw, 14px) rotate(3deg); }
  100% { transform: translate(45vw, 28px) rotate(10deg); }
}
@keyframes docDrop {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  85% { transform: translateY(38vh) rotate(22deg); opacity: 1; }
  100% { transform: translateY(40vh) rotate(24deg); opacity: 1; }
}
@keyframes landBurst {
  0% { transform: scale(0.2); opacity: 0; }
  35% { opacity: 0.95; }
  100% { transform: scale(2.8); opacity: 0; }
}
@keyframes revaReveal {
  0% { opacity: 0; transform: scale(0.94); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ellipsisPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
`,
        }}
      />

      <div className="relative h-[52vh] w-full max-w-5xl overflow-hidden">
        {showCelebrate ? (
          <div className="absolute inset-0">
            <div
              className="pointer-events-none absolute left-1/2 top-[10%] will-change-transform"
              style={{
                animation: 'f16Cross 2.5s cubic-bezier(0.42, 0, 0.58, 1) forwards',
                marginLeft: '-60px',
              }}
            >
              <F16JetSvg />
            </div>
            {[0.6, 1.2, 1.8].map((delay, i) => (
              <div
                key={i}
                className="pointer-events-none absolute left-1/2 top-[12%] text-2xl"
                style={{
                  marginLeft: `${-40 + i * 36}px`,
                  animation: `docDrop 1.15s cubic-bezier(0.33, 0.82, 0.54, 1) ${delay}s forwards`,
                  opacity: 0,
                }}
                aria-hidden
              >
                📄
                <span
                  className="absolute left-1/2 top-[40vh] block h-4 w-4 -translate-x-1/2 rounded-full bg-orange-500/90"
                  style={{
                    animation: `landBurst 0.55s ease-out ${delay + 1.05}s forwards`,
                    opacity: 0,
                  }}
                />
              </div>
            ))}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{
                animation: 'revaReveal 0.8s ease-out 3s forwards',
                opacity: 0,
              }}
            >
              <img
                src={REVA_AVATAR}
                alt="Reva"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover shadow-xl"
                style={{ border: '2px solid #F97316' }}
              />
              <p className="text-lg font-semibold text-white">Done! Here&apos;s what I found.</p>
              <p className="text-sm text-slate-300">{documentName}</p>
            </div>
          </div>
        ) : null}

        {showWorking ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
            <p className="text-sm text-slate-400">Preparing airlift…</p>
          </div>
        ) : null}
      </div>

      {showWorking ? (
        <div className="mt-4 max-w-md px-6 text-center">
          <p className="text-base font-medium text-slate-100">
            Reva is reading the documents
            <span className="inline-block w-6 text-left" style={{ animation: 'ellipsisPulse 1s ease-in-out infinite' }}>
              {dots}
            </span>
          </p>
          <p className="mt-3 text-sm text-orange-200/90">{progressText}</p>
        </div>
      ) : null}
    </div>
  )
}
