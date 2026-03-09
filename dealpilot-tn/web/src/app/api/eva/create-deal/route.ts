import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''
    const res = await fetch((origin||'') + '/api/eva/wizard/create-deal', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const j = await res.json()
    return NextResponse.json(j, { status: res.status })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
