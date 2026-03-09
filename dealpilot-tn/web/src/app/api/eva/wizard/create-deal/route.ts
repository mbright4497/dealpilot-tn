import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request){
  try{
    const payload = await req.json()
    // Create transaction via existing endpoint
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''
    const txRes = await fetch((origin||'') + '/api/transactions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
      address: payload.propertyAddress || '',
      client: (payload.buyerNames || []).join(', '),
      type: payload.contractType || 'Buyer',
      status: 'Active',
      binding: payload.bindingDate || '',
      closing: payload.closingDate || '',
      notes: payload.specialStipulations || '',
      purchase_price: payload.purchasePrice || null,
      earnest_money: payload.earnestMoney || null,
      buyer_names: (payload.buyerNames||[]).join(', '),
      seller_names: (payload.sellerNames||[]).join(', '),
      timeline: JSON.stringify(payload.timeline || [])
    })})
    const txJson = await txRes.json()
    if(!txRes.ok) return NextResponse.json({ error: 'tx create failed', detail: txJson }, { status: 500 })
    const dealId = txJson.id
    // run compliance
    await fetch((origin||'') + '/api/compliance/run', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: dealId }) })
    // return a summary
    return NextResponse.json({ dealId, address: txJson.address || payload.propertyAddress || '', timeline: payload.timeline || [], complianceCount: 0 })
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
