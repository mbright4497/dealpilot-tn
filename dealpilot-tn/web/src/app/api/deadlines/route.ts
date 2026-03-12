import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request){
  try{
    const supabase = createServerSupabaseClient({ req, res: undefined as any })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: transactions, error } = await supabase.from('transactions').select('*')
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    const now = Date.now()
    const deadlines: any[] = []
    for(const t of transactions || []){
      const address = t.property_address || t.address || t.property || ''
      const addIf = (label:string, dateVal:any)=>{
        if(!dateVal) return
        const dt = new Date(dateVal)
        if(isNaN(dt.getTime())) return
        const days_remaining = Math.ceil((dt.getTime() - now)/(1000*60*60*24))
        const status = days_remaining < 0 ? 'overdue' : days_remaining === 0 ? 'today' : 'upcoming'
        deadlines.push({ label, date: dt.toISOString().slice(0,10), address, transaction_id: t.id, days_remaining, status })
      }
      addIf('Closing', t.closing_date || t.closing)
      addIf('Binding', t.binding_date || t.binding)
      addIf('Inspection Ends', t.inspection_end_date || t.inspection_end)
      addIf('Financing Contingency', t.financing_contingency_date)
      // timeline array
      if(Array.isArray(t.timeline)){
        for(const e of t.timeline){ if(e && (e.date || e.due_date)) addIf(e.label || e.name || 'Milestone', e.date || e.due_date) }
      }
    }
    deadlines.sort((a,b)=> a.days_remaining - b.days_remaining)
    return NextResponse.json({ ok:true, deadlines })
  }catch(e:any){ return NextResponse.json({ error: String(e?.message||e) }, { status:500 }) }
}
