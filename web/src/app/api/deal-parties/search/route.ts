export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import GHLClient from '@/lib/ghl'

export async function GET(req: Request){
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  try{
    const ghl = new GHLClient()
    const res = await ghl.searchContacts(q)
    return NextResponse.json({ ok:true, results: res })
  }catch(e:any){
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
