export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { TREC_FORMS } from '@/lib/trec-forms'

// Server-side Supabase client (use SERVICE_ROLE for server)
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE) : null

export async function GET() {
  const forms = TREC_FORMS.map(f=>({ id:f.id, code:f.code, name:f.name, shortName:f.shortName, category:f.category, pages:f.pages, description:f.description }))
  return NextResponse.json({ forms })
}

export async function POST(req: NextRequest){
  try{
    const { formId, transactionId } = await req.json()
    const form = TREC_FORMS.find(f=>f.id===formId)
    if(!form) return NextResponse.json({ error:'Form not found' }, { status:404 })

    let tx:any = null
    if(supabase && transactionId){
      const { data, error } = await supabase.from('deals').select('*').eq('id', transactionId).single()
      if(!error) tx = data
    }

    // fallback mock
    if(!tx){
      tx = { id: transactionId || 1, address: '123 Maple St, Johnson City, TN', buyerName: 'Alice Johnson', sellerName: 'Acme Builders LLC', closingDate: '2026-03-15', agent: { name: 'Matt Bright', firm: 'iHome-KW Kingsport', phone: '423-555-0100', email: 'matt@dealpilottn.com' } }
    }

    const prefill: Record<string, any> = {}
    form.fields.forEach(field=>{
      if(field.id==='propertyAddress') prefill[field.id] = tx.address
      else if(field.id==='buyerName' || field.id==='tenantName') prefill[field.id] = tx.buyerName || tx.client || ''
      else if(field.id==='sellerName' || field.id==='landlordName') prefill[field.id] = tx.sellerName || ''
      else if(field.id==='closingDate') prefill[field.id] = tx.closing_date || tx.closing || tx.closingDate || ''
      else if(field.id==='listingBrokerFirmName') prefill[field.id] = tx.agent?.firm || 'iHome-KW Kingsport'
      else if(field.id==='listingBrokerPhone') prefill[field.id] = tx.agent?.phone || ''
      else if(field.id==='listingBrokerEmail') prefill[field.id] = tx.agent?.email || ''
      else prefill[field.id] = ''
    })
    return NextResponse.json({ form: { id: form.id, code: form.code, name: form.name }, prefill })
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
