import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request){
  try{
    const body = await req.json()
    // Proxy to existing AI chat backend
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const chatRes = await fetch(new URL('/api/ai/chat', base).toString(), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const chatJson = await chatRes.json()

    // detect user intent to start a new transaction
    const messages = body.messages || []
    const lastUser = [...messages].reverse().find((m:any)=>m.role==='user')
    const userAskedNewDeal = lastUser && /\b(start|create|new)\b[\s\S]{0,60}\b(deal|transaction)\b/i.test(lastUser.content || '')

    if (userAskedNewDeal && chatJson.extractedFields && Object.keys(chatJson.extractedFields).length>0){
      // map extracted fields to intake-apply expected fields
      const ef = chatJson.extractedFields
      const fields:any = {
        propertyAddress: ef.address || ef.propertyAddress || ef.property || '',
        buyerNames: ef.buyer_names || ef.buyerNames || ef.client_name || ef.client || null,
        sellerNames: ef.seller_names || ef.sellerNames || null,
        purchasePrice: ef.purchase_price || ef.price || null,
        bindingDate: ef.binding_date || ef.bindingDate || null,
        inspectionEndDate: ef.inspection_end_date || ef.inspectionEndDate || null,
        closingDate: ef.closing_date || ef.closingDate || ef.closing || null
      }
      try{
        const intakeRes = await fetch(new URL('/api/intake-apply', base).toString(), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fields }) })
        const intakeJson = await intakeRes.json()
        // append flags for frontend
        chatJson.intent = 'create_transaction'
        chatJson.createTransaction = true
        chatJson.createdTransactionId = intakeJson.transactionId || null
      }catch(e){ console.error('intake apply failed', e) }
    }

    return NextResponse.json(chatJson)
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
