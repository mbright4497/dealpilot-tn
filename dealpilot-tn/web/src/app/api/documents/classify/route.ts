import { NextResponse } from 'next/server'
import { FORM_REGISTRY } from '@/lib/document-registry'

export const runtime = 'nodejs'

type Req = { filename?: string, text_preview?: string }

// simple classifier: look for rfNumber or name tokens in preview or filename
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Req
    const filename = (body.filename || '').toLowerCase()
    const preview = (body.text_preview || '').toLowerCase()

    // flatten registry
    const flat = ([] as any[]).concat(...Object.values(FORM_REGISTRY || {}))

    // first pass: exact rf match in filename or preview
    for (const f of flat) {
      if (!f) continue
      const rf = (f.rfNumber || f.rfNumber || '').toLowerCase()
      if (rf && (filename.includes(rf) || preview.includes(rf))) {
        return NextResponse.json({ rf_number: f.rfNumber, name: f.name, category: f.category, confidence: 0.98 })
      }
    }

    // second pass: match by name tokens
    for (const f of flat) {
      const name = (f.name || '').toLowerCase()
      if (!name) continue
      // require at least two words match
      const tokens = name.split(/\s+/).filter(Boolean)
      let matches = 0
      for (const t of tokens) {
        if (t.length < 3) continue
        if (preview.includes(t) || filename.includes(t)) matches++
      }
      if (matches >= Math.min(2, tokens.length)) {
        return NextResponse.json({ rf_number: f.rfNumber, name: f.name, category: f.category, confidence: 0.86 })
      }
    }

    // fallback: return unknown
    return NextResponse.json({ rf_number: null, name: null, category: 'other', confidence: 0.2 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
