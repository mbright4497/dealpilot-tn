import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(){
  try{
    // try common endpoints
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/deal-state/all`)
    let deals = []
    if (res.ok) deals = await res.json()
    else {
      const txRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/transactions`)
      deals = txRes.ok ? await txRes.json() : []
    }
    // normalize milestones from timeline fields or known date fields
    const milestones: any[] = []
    for(const d of deals || []){
      const address = d.address || d.property_address || d.propertyAddress || ''
      const id = d.id
      // known fields
      const candidates: any[] = []
      if (d.inspection_end_date) candidates.push({ label: 'Inspection Ends', date: d.inspection_end_date })
      if (d.financing_contingency_date) candidates.push({ label: 'Financing Contingency', date: d.financing_contingency_date })
      if (d.closing_date || d.closing) candidates.push({ label: 'Closing', date: d.closing_date || d.closing })
      if (d.binding_date) candidates.push({ label: 'Binding Date', date: d.binding_date })
      if (Array.isArray(d.timeline)){
        for(const t of d.timeline){ if(t.date) candidates.push({ label: t.label || t.name || 'Milestone', date: t.date }) }
      }
      for(const c of candidates){
        if(!c.date) continue
        const dt = new Date(c.date)
        if(isNaN(dt.getTime())) continue
        const days_remaining = Math.ceil((dt.getTime() - Date.now())/(1000*60*60*24))
        let status = 'upcoming'
        if (days_remaining < 0) status = 'overdue'
        else if (days_remaining === 0) status = 'today'
        milestones.push({ transaction_id: id, address, label: c.label, date: dt.toISOString().slice(0,10), days_remaining, status })
      }
    }
    milestones.sort((a,b)=>a.days_remaining - b.days_remaining)
    const next = milestones.slice(0,5)
    return NextResponse.json({ milestones: next })
  }catch(e:any){
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
