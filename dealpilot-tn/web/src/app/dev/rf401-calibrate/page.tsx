'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Script from 'next/script'

/** Match FIELD_COORDS in lib/rf401/fieldCoordinates.ts (150 dpi raster space, top-left origin). */
const RENDER_SCALE = 150 / 72

const PDF_URL = '/forms/rf401-blank.pdf'

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> }
    }
  }
}

interface PDFDocumentProxy {
  numPages: number
  getPage: (n: number) => Promise<PDFPageProxy>
}

interface PDFPageProxy {
  getViewport: (opts: { scale: number }) => { width: number; height: number }
  render: (opts: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => { promise: Promise<void> }
}

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
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(null)
  const [numPages, setNumPages] = useState(11)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null)

  useEffect(() => {
    if (!pdfjsReady || !window.pdfjsLib) return
    let cancelled = false
    setLoadError(null)
    fetch(PDF_URL)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch PDF (${r.status})`)
        return r.arrayBuffer()
      })
      .then(buf => window.pdfjsLib!.getDocument({ data: buf }).promise)
      .then(pdf => {
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setPdfLoaded(true)
      })
      .catch(e => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load PDF')
      })
    return () => {
      cancelled = true
    }
  }, [pdfjsReady])

  const renderCurrentPage = useCallback(async () => {
    const pdf = pdfDocRef.current
    const canvas = canvasRef.current
    const lib = typeof window !== 'undefined' ? window.pdfjsLib : undefined
    if (!pdf || !canvas || !lib || !pdfLoaded) return

    const pageNum = Math.min(Math.max(1, currentPage), pdf.numPages)
    if (pageNum !== currentPage) setCurrentPage(pageNum)

    try {
      renderTaskRef.current?.cancel?.()
    } catch {
      /* ignore */
    }
    setRendering(true)
    setPageDims(null)

    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setLoadError('Canvas 2D context unavailable')
        setRendering(false)
        return
      }

      canvas.width = viewport.width
      canvas.height = viewport.height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
      setPageDims({ w: viewport.width, h: viewport.height })
    } catch (e) {
      if ((e as Error)?.name !== 'RenderingCancelledException') {
        setLoadError(e instanceof Error ? e.message : 'Render failed')
      }
    } finally {
      setRendering(false)
    }
  }, [currentPage, pdfLoaded])

  useEffect(() => {
    if (!pdfLoaded) return
    void renderCurrentPage()
  }, [pdfLoaded, renderCurrentPage])

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !pageDims) return
    if (!label.trim()) {
      alert('Enter a field label before clicking')
      return
    }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
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
    void navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace', fontSize: 13 }}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            window.pdfjsLib!.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            setPdfjsReady(true)
          } catch {
            setLoadError('PDF.js failed to initialize')
          }
        }}
        onError={() => setLoadError('Failed to load PDF.js from CDN')}
      />

      {/* Left panel */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          background: '#1a1a2e',
          color: '#eee',
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 15, color: '#a78bfa' }}>RF401 Calibrator</div>

        {loadError && (
          <div style={{ background: '#450a0a', color: '#fecaca', padding: 8, borderRadius: 4, fontSize: 12 }}>
            {loadError}
          </div>
        )}

        <div>
          <div style={{ color: '#aaa', marginBottom: 4 }}>Page</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: pdfLoaded ? numPages : 11 }, (_, i) => i + 1).map(p => (
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
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#111',
              color: '#fff',
              fontFamily: 'monospace',
            }}
          />
        </div>

        <div>
          <div style={{ color: '#aaa', marginBottom: 4 }}>Mapped points ({points.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {points.map(p => (
              <div
                key={p.id}
                style={{
                  background: '#222',
                  borderRadius: 4,
                  padding: '4px 8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ color: '#a78bfa' }}>p{p.page}</span>{' '}
                  <span style={{ color: '#34d399' }}>{p.label}</span>
                  <br />
                  <span style={{ color: '#888', fontSize: 11 }}>
                    x:{p.x} y:{p.y}
                  </span>
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
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: copied ? '#34d399' : '#a78bfa',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          {copied ? '✓ Copied!' : 'Copy JSON to clipboard'}
        </button>

        <div style={{ color: '#666', fontSize: 11, lineHeight: 1.5 }}>
          1. Type a field label
          <br />
          2. Click the exact spot on the PDF
          <br />
          3. Repeat for all fields
          <br />
          4. Click Copy JSON when done
        </div>
        <div style={{ color: '#555', fontSize: 10 }}>
          Coordinates are 150dpi top-left space (same as FIELD_COORDS). Source: {PDF_URL}
        </div>
      </div>

      {/* PDF panel */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#111', padding: 24, position: 'relative' }}>
        {rendering && (
          <div style={{ position: 'absolute', top: 28, right: 28, color: '#888', fontSize: 12 }}>Rendering…</div>
        )}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: 'crosshair', display: 'block', maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
          />
          {pageDims &&
            canvasRef.current &&
            points
              .filter(p => p.page === currentPage)
              .map(p => {
                const canvas = canvasRef.current!
                const rect = canvas.getBoundingClientRect()
                const w = pageDims.w
                const h = pageDims.h
                const left = (p.x / w) * rect.width
                const top = (p.y / h) * rect.height
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
