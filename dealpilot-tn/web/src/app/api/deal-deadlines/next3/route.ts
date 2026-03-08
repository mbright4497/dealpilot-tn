export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(){
  try{
    const base = process.env.NEXT_PUBLIC_APP_URL || ''
    const res = await fetch(base + '/api/transactions')
    if(!res.ok) return NextResponse.json([], { status: 200 })
    const tx = await res.json()
    const now = new Date()
    const items: any[] = []
    for(const t of tx){
      const binding = t.binding ? new Date(t.binding) : null
      const closing = t.closing ? new Date(t.closing) : null
      if(binding){ const days = Math.ceil((binding.getTime()-now.getTime())/(1000*60*60*24)); if(days<=3) items.push({ id: t.id, address: t.address, label: 'Binding Date', daysAway: days }) }
      if(closing){ const days = Math.ceil((closing.getTime()-now.getTime())/(1000*60*60*24)); if(days<=3) items.push({ id: t.id, address: t.address, label: 'Closing Date', daysAway: days }) }
    }
    items.sort((a,b)=>a.daysAway - b.daysAway)
    return NextResponse.json(items.slice(0,10))
  }catch(err:any){ return NextResponse.json([], { status:200 }) }
}
