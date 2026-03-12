import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(){
  try{
    const token = process.env.GHL_API_KEY || process.env.GHL_TOKEN
    if(!token) return NextResponse.json({ ok:false, error: 'GHL not connected' })
    // Example: proxy to GHL contacts API
    const res = await fetch('https://api.gohighlevel.com/v1/contacts', { headers: { Authorization: `Bearer ${token}` } })
    if(!res.ok) return NextResponse.json({ ok:false, error: 'GHL API error' }, { status: 502 })
    const j = await res.json()
    return NextResponse.json({ ok:true, contacts: j.contacts || j.data || j })
  }catch(e:any){ return NextResponse.json({ ok:false, error: String(e?.message||e) }, { status:500 }) }
}
