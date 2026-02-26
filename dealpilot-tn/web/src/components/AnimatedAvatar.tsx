'use client'
import React from 'react'

export default function AnimatedAvatar({ isSpeaking, size = 48 }: { isSpeaking: boolean; size?: number }){
  const w = size
  const h = Math.round(size * 1.1)
  return (
    <div style={{ width: w, height: h }} className="inline-block">
      <svg width={w} height={h} viewBox="0 0 120 132" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
        <defs>
          <style>{`
            .avatar-head{fill:#374151;stroke:#f97316;stroke-width:2}
            .avatar-eye{fill:#fb923c}
            .blink{animation: blink 3s infinite}
            @keyframes blink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(0.1)}}
            .mouth-neutral{fill:#111827}
            .mouth-talk{animation: mouthTalk 0.3s infinite}
            @keyframes mouthTalk{0%{transform:scaleY(0.2)}50%{transform:scaleY(1)}100%{transform:scaleY(0.2)}}
            .antenna-dot{fill:#fb923c;animation: pulse 1.5s infinite}
            @keyframes pulse{0%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}100%{opacity:0.6;transform:scale(1)}}
          `}</style>
        </defs>
        {/* head */}
        <rect x="6" y="12" rx="12" ry="12" width="108" height="100" className="avatar-head" />
        {/* antenna */}
        <rect x="54" y="2" width="12" height="12" rx="6" className="avatar-head" transform="translate(0,0)" />
        <circle cx="60" cy="8" r="3" className="antenna-dot" />
        {/* eyes */}
        <g transform="translate(0,8)">
          <g className="blink" transform-origin="40px 48px">
            <circle cx="36" cy=" fifty" r="8" className="avatar-eye" />
          </g>
          <g className="blink" transform-origin="80px 48px">
            <circle cx="84" cy=" fifty" r="8" className="avatar-eye" />
          </g>
        </g>
        {/* mouth */}
        <g transform="translate(0,68)">
          <rect x="36" y="12" width="48" height="8" rx="4" className={isSpeaking? 'mouth-neutral mouth-talk':'mouth-neutral'} style={{ transformOrigin: '60px 16px' }} />
        </g>
      </svg>
    </div>
  )
}
