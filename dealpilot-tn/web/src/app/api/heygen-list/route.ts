export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
    if (!HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY not configured' }, { status: 500 })
    const res = await fetch('https://api.heygen.com/v1/streaming/avatar.list', { method: 'GET', headers: { 'x-api-key': HEYGEN_API_KEY } })
    const text = await res.text()
    const status = res.status
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    return new NextResponse(text, { status, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
