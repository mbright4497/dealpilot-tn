import { NextRequest, NextResponse } from 'next/server'
import { TREC_FORMS } from '@/lib/trec-forms'

export async function GET() {
  const forms = TREC_FORMS.map(f=>({ id:f.id, code:f.code, name:f.name, shortName:f.shortName, category:f.category, pages:f.pages, description:f.description }))
  return NextResponse.json({ forms })
}

export async function POST(req: NextRequest){
  try{
    const { formId, transactionId } = await req.json()
    const form = TREC_FORMS.find(f=>f.id===formId)
    if(!form) return NextResponse.json({ error:'Form not found' }, { status:404 })
    // mock transaction lookup
    const mockTx = {
      id: transactionId || 1,
      address: '123 Maple St, Johnson City, TN',
      buyerName: 'Alice Johnson',
      sellerName: 'Acme Builders LLC',
      closingDate: '2026-03-15',
      agent: { name: 'Matt Bright', firm: 'iHome-KW Kingsport', phone: '423-555-0100', email: 'matt@dealpilottn.com' }
    }
    const prefill: Record<string, any> = {}
    form.fields.forEach(field=>{
      if(field.id==='propertyAddress') prefill[field.id] = mockTx.address
      else if(field.id==='buyerName' || field.id==='tenantName') prefill[field.id] = mockTx.buyerName
      else if(field.id==='sellerName' || field.id==='landlordName') prefill[field.id] = mockTx.sellerName
      else if(field.id==='closingDate') prefill[field.id] = mockTx.closingDate
      else if(field.id==='listingBrokerFirmName') prefill[field.id] = mockTx.agent.firm
      else if(field.id==='listingBrokerPhone') prefill[field.id] = mockTx.agent.phone
      else if(field.id==='listingBrokerEmail') prefill[field.id] = mockTx.agent.email
      else prefill[field.id] = ''
    })
    return NextResponse.json({ form: { id: form.id, code: form.code, name: form.name }, prefill })
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
