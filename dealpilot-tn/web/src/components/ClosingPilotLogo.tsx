import React from 'react'

export default function ClosingPilotLogo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const height = size === 'sm' ? 32 : 60
  const jetSize = size === 'sm' ? 14 : 22
  const textStyle = { fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', fontWeight: 700 } as any
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height }}>
      <svg width={jetSize} height={jetSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M2 21s4-2 7-5c3-3 5-7 7-11 0 0-4 1-7 4-3 3-6 6-7 12z" fill="#f97316" />
        <path d="M9 8l6-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ color: '#ffffff', fontSize: size === 'sm' ? 14 : 28, ...textStyle }}>Closing Jet</span>
        <span style={{ color: '#f97316', fontSize: size === 'sm' ? 12 : 20, fontWeight: 800 }}>TN</span>
      </div>
    </div>
  )
}
