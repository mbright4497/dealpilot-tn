import { NextResponse } from 'next/server'
import { POST as contractParsePost } from '../../contract-parse/route'
import { POST as intakeApplyPost } from '../../intake-apply/route'
import { POST as analyzeTransactionPost } from '../../transactions/[id]/analyze/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const transactionIdRaw = form.get('transactionId') || form.get('dealId')
    const transactionId = transactionIdRaw ? String(transactionIdRaw) : ''

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!transactionId) return NextResponse.json({ error: 'transactionId required' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 1) Extract RF401 fields from the PDF.
    const parseReq = new Request('http://localhost/api/contract-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64 }),
    })
    const parsedRes = await contractParsePost(parseReq)
    const parsedJson = await parsedRes.json().catch(() => ({}))
    if (!parsedJson || !parsedJson.fields) {
      return NextResponse.json({ error: parsedJson?.error || 'contract parse failed' }, { status: 400 })
    }

    // 2) Apply extracted data into transaction/deal_state.
    const intakeReq = new Request('http://localhost/api/intake-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: parsedJson.fields, timeline: parsedJson.timeline }),
    })
    const intakeRes = await intakeApplyPost(intakeReq)
    const intakeJson = await intakeRes.json().catch(() => ({}))
    if (!intakeRes.ok) {
      return NextResponse.json({ error: intakeJson?.error || 'intake apply failed' }, { status: 500 })
    }

    // 3) Generate the deal’s intelligence package (summary/checklist/deadlines).
    const analyzeReq = new Request('http://localhost/api/transactions/' + transactionId + '/analyze', { method: 'POST' })
    const analyzeRes = await analyzeTransactionPost(analyzeReq, { params: { id: transactionId } } as any)
    const analyzeJson = await analyzeRes.json().catch(() => ({}))
    if (!analyzeRes.ok) {
      return NextResponse.json({ error: analyzeJson?.error || 'analyze failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      transactionId: intakeJson?.transactionId || transactionId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

