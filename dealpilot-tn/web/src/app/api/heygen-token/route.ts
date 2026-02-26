import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try{
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
    if(!HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY not configured' }, { status:500 })
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', { method: 'POST', headers: { 'x-api-key': HEYGEN_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    const token = data?.data?.token || data?.token
    if(!token) return NextResponse.json({ error: 'no token' }, { status:500 })
    return NextResponse.json({ token })
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
