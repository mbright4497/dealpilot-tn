'use client'
import React from 'react'

export default function AnimatedAvatar({ isSpeaking, size = 80 }: { isSpeaking: boolean; size?: number }){
  const w = size
  const h = Math.round(size * 1.15)
  return (
    <div style={{ width: w, height: h }} className="inline-block">
      <svg width={w} height={h} viewBox="0 0 120 138" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
        <defs>
          <style>{`
            .av-head{fill:#1f2937;stroke:#f97316;stroke-width:3}
            .av-eye{fill:#fb923c}
            .av-eye-glow{fill:#fb923c;filter:drop-shadow(0 0 6px #fb923c)}
            .av-blink{animation:avBlink 3.5s infinite}
            @keyframes avBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(0.08)}}
            .av-mouth-idle{fill:#374151;rx:4}
            .av-mouth-talk{animation:avTalk 0.28s infinite}
            @keyframes avTalk{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
            .av-antenna{fill:#fb923c;filter:drop-shadow(0 0 8px #fb923c)}
            .av-pulse{animation:avPulse 1.5s infinite}
            @keyframes avPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
            .av-ear{fill:#374151;stroke:#f97316;stroke-width:2}
          `}</style>
        </defs>
        {/* antenna */}
        <line x1="60" y1="18" x2="60" y2="4" stroke="#f97316" strokeWidth="2" />
        <circle cx="60" cy="4" r="4" className="av-antenna av-pulse" />
        {/* head */}
        <rect x="16" y="18" rx="16" ry="16" width="88" height="90" className="av-head" />
        {/* ears */}
        <rect x="4" y="48" width="12" height="24" rx="4" className="av-ear" />
        <rect x="104" y="48" width="12" height="24" rx="4" className="av-ear" />
        {/* visor band */}
        <rect x="28" y="42" width="64" height="28" rx="10" fill="#111827" stroke="#374151" strokeWidth="1" />
        {/* eyes */}
        <g className="av-blink" style={{ transformOrigin: '44px 56px' }}>
          <circle cx="44" cy="56" r="8" className={isSpeaking ? 'av-eye-glow' : 'av-eye'} />
        </g>
        <g className="av-blink" style={{ transformOrigin: '76px 56px' }}>
          <circle cx="76" cy="56" r="8" className={isSpeaking ? 'av-eye-glow' : 'av-eye'} />
        </g>
        {/* mouth */}
        <rect x="40" y="82" width="40" height={isSpeaking ? 12 : 6} rx="4" className={isSpeaking ? 'av-mouth-idle av-mouth-talk' : 'av-mouth-idle'} style={{ transformOrigin: '60px 86px' }} />
        {/* neck */}
        <rect x="50" y="108" width="20" height="10" rx="3" fill="#374151" stroke="#f97316" strokeWidth="1" />
        {/* shoulders hint */}
        <rect x="30" y="118" width="60" height="16" rx="8" fill="#1f2937" stroke="#f97316" strokeWidth="2" />
      </svg>
    </div>
  )
}
