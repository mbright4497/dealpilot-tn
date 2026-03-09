import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request){
  try{
    const form = await req.formData()
    const file = form.get('file') as unknown as Blob
    if(!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
    // Forward to existing contract-parse API route which expects a file field
    const fdata = new FormData()
    fdata.append('file', file)
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''
    const res = await fetch((origin || '') + '/api/contract-parse', {
      method: 'POST',
      body: fdata,
    })
    const j = await res.json()
    if(!res.ok) return NextResponse.json({ error: 'parse failed', detail: j }, { status: 500 })
    return NextResponse.json(j)
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
