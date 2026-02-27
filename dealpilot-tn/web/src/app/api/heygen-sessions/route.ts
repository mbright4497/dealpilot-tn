import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest){
  try{
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
    if(!HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY not configured' }, { status:500 })
    const res = await fetch('https://api.heygen.com/v1/streaming.list', { method: 'GET', headers: { 'x-api-key': HEYGEN_API_KEY } })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}

export async function DELETE(req: NextRequest){
  try{
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
    if(!HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY not configured' }, { status:500 })
    const body = await req.json()
    const session_id = body?.session_id
    if(!session_id) return NextResponse.json({ error: 'session_id required' }, { status:400 })
    const res = await fetch('https://api.heygen.com/v1/streaming.stop', { method: 'POST', headers: { 'x-api-key': HEYGEN_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id }) })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
