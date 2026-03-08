export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST(req: Request){
  try{
    const body = await req.json()
    console.error('CLIENT ERROR:', body)
  }catch(e){ console.error('CLIENT ERROR PARSE FAIL', e) }
  return NextResponse.json({ ok: true })
}
