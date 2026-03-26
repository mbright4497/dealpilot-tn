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

export default function DocumentAirDrop({
  isVisible,
  documentName,
  status = 'processing',
  onComplete,
}: DocumentAirDropProps) {
  const [progressIdx, setProgressIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'run' | 'success' | 'exit'>('idle')
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
    setPhase('success')
    const t = setTimeout(() => {
      setPhase('exit')
      onComplete?.()
    }, 3200)
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

  const showSuccess = phase === 'success' || phase === 'exit'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 text-white"
      aria-live="polite"
      aria-busy={!showSuccess}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes docJetFly {
  0% { transform: translate(-20vw, 12px) rotate(-4deg); opacity: 1; }
  100% { transform: translate(110vw, -28px) rotate(6deg); opacity: 1; }
}
@keyframes docJetBank {
  0% { transform: translate(40vw, 40vh) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(120vw, -20vh) scale(0.6) rotate(24deg); opacity: 0; }
}
@keyframes docFall1 {
  0% { transform: translate(12vw, 0) rotate(0deg); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(12vw, 42vh) rotate(18deg); opacity: 0.95; }
}
@keyframes docFall2 {
  0% { transform: translate(38vw, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(38vw, 42vh) rotate(-14deg); opacity: 0.95; }
}
@keyframes docFall3 {
  0% { transform: translate(64vw, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(64vw, 42vh) rotate(22deg); opacity: 0.95; }
}
@keyframes burst {
  0% { transform: scale(0.2); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes fadeReva {
  0% { opacity: 0; transform: scale(0.92); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ellipsisPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
`,
        }}
      />

      <div className="relative h-[48vh] w-full max-w-5xl overflow-hidden">
        {!showSuccess ? (
          <>
            <div
              className="absolute left-0 top-8 will-change-transform"
              style={{
                animation: phase === 'exit' ? 'docJetBank 1.2s ease-in forwards' : 'docJetFly 3s ease-in-out infinite',
              }}
            >
              <svg width="120" height="48" viewBox="0 0 120 48" aria-hidden>
                <defs>
                  <linearGradient id="flame" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff6b00" />
                    <stop offset="100%" stopColor="#ffcc00" />
                  </linearGradient>
                </defs>
                <polygon points="0,24 44,10 92,24 44,38" fill="#4b5563" />
                <polygon points="92,24 108,18 120,24 108,30" fill="#6b7280" />
                <polygon points="0,24 -18,20 -18,28" fill="url(#flame)" opacity="0.9" />
              </svg>
            </div>

            <div
              className="absolute top-[44vh] left-0 text-2xl"
              style={{ animation: 'docFall1 2.2s ease-in 0.5s infinite' }}
              aria-hidden
            >
              📄
              <span
                className="absolute -left-2 top-6 block h-3 w-3 rounded-full bg-orange-500/80"
                style={{ animation: 'burst 0.6s ease-out 2.1s infinite' }}
              />
            </div>
            <div
              className="absolute top-[44vh] left-0 text-2xl"
              style={{ animation: 'docFall2 2.2s ease-in 1s infinite' }}
              aria-hidden
            >
              📄
              <span
                className="absolute -left-2 top-6 block h-3 w-3 rounded-full bg-orange-500/80"
                style={{ animation: 'burst 0.6s ease-out 2.6s infinite' }}
              />
            </div>
            <div
              className="absolute top-[44vh] left-0 text-2xl"
              style={{ animation: 'docFall3 2.2s ease-in 1.5s infinite' }}
              aria-hidden
            >
              📄
              <span
                className="absolute -left-2 top-6 block h-3 w-3 rounded-full bg-orange-500/80"
                style={{ animation: 'burst 0.6s ease-out 3.1s infinite' }}
              />
            </div>
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ animation: 'fadeReva 0.8s ease-out forwards' }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/20 text-3xl font-bold text-orange-200 ring-2 ring-orange-500/50">
              R
            </div>
            <p className="text-lg font-semibold text-white">Done! Here&apos;s what I found.</p>
            <p className="text-sm text-slate-300">{documentName}</p>
          </div>
        )}
      </div>

      {!showSuccess ? (
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
