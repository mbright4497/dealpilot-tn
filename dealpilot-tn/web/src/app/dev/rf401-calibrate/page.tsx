'use client'

import { useState, useRef } from 'react'

interface ClickPoint {
  id: string
  page: number
  x: number
  y: number
  label: string
}

export default function RF401CalibratePage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [points, setPoints] = useState<ClickPoint[]>([])
  const [label, setLabel] = useState('')
  const [copied, setCopied] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const totalPages = 11

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgRef.current) return
    if (!label.trim()) {
      alert('Enter a field label before clicking')
      return
    }
    const rect = imgRef.current.getBoundingClientRect()
    const naturalW = imgRef.current.naturalWidth
    const naturalH = imgRef.current.naturalHeight
    const scaleX = naturalW / rect.width
    const scaleY = naturalH / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    const point: ClickPoint = {
      id: `${label.trim().replace(/\s+/g, '_')}_p${currentPage}`,
      page: currentPage,
      x,
      y,
      label: label.trim(),
    }
    setPoints(prev => [...prev, point])
    setLabel('')
  }

  function removePoint(id: string) {
    setPoints(prev => prev.filter(p => p.id !== id))
  }

  function exportJSON() {
    const output = points.map(p => ({
      fieldId: p.id,
      label: p.label,
      page: p.page,
      x: p.x,
      y: p.y,
      fontSize: 9,
      maxWidth: 200,
      type: 'text',
    }))
    const json = JSON.stringify(output, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace', fontSize: 13 }}>
      {/* Left panel */}
      <div style={{ width: 280, minWidth: 280, background: '#1a1a2e', color: '#eee', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 'bold', fontSize: 15, color: '#a78bfa' }}>RF401 Calibrator</div>

        <div>
          <div style={{ color: '#aaa', marginBottom: 4 }}>Page</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentPage === p ? '#a78bfa' : '#333',
                  color: '#fff',
                  fontWeight: currentPage === p ? 'bold' : 'normal',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: '#aaa', marginBottom: 4 }}>Field label (then click PDF)</div>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            placeholder="e.g. buyer_1_name"
            style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #555', background: '#111', color: '#fff', fontFamily: 'monospace' }}
          />
        </div>

        <div>
          <div style={{ color: '#aaa', marginBottom: 4 }}>Mapped points ({points.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {points.map(p => (
              <div key={p.id} style={{ background: '#222', borderRadius: 4, padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#a78bfa' }}>p{p.page}</span>
                  {' '}
                  <span style={{ color: '#34d399' }}>{p.label}</span>
                  <br />
                  <span style={{ color: '#888', fontSize: 11 }}>x:{p.x} y:{p.y}</span>
                </div>
                <button
                  onClick={() => removePoint(p.id)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={exportJSON}
          style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: copied ? '#34d399' : '#a78bfa', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}
        >
          {copied ? '✓ Copied!' : 'Copy JSON to clipboard'}
        </button>

        <div style={{ color: '#666', fontSize: 11, lineHeight: 1.5 }}>
          1. Type a field label<br />
          2. Click the exact spot on the PDF<br />
          3. Repeat for all fields<br />
          4. Click Copy JSON when done
        </div>
      </div>

      {/* PDF panel */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#111', padding: 24, position: 'relative' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`/api/dev/rf401-page?page=${currentPage}`}
            alt={`RF401 Page ${currentPage}`}
            onClick={handleClick}
            style={{ cursor: 'crosshair', display: 'block', maxWidth: '100%', border: '1px solid #333' }}
          />
          {/* Overlay dots for current page */}
          {points
            .filter(p => p.page === currentPage)
            .map(p => {
              if (!imgRef.current) return null
              const rect = imgRef.current.getBoundingClientRect()
              const naturalW = imgRef.current.naturalWidth
              const naturalH = imgRef.current.naturalHeight
              const left = (p.x / naturalW) * rect.width
              const top = (p.y / naturalH) * rect.height
              return (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    left: left - 5,
                    top: top - 5,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#a78bfa',
                    border: '2px solid #fff',
                    pointerEvents: 'none',
                  }}
                  title={p.label}
                />
              )
            })}
        </div>
      </div>
    </div>
  )
}
