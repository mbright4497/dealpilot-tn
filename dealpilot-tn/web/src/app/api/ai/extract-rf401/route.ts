import { NextResponse } from 'next/server'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { text, dealId } = body
    // Call OpenAI to extract fields via function-calling or prompt (placeholder)
    // For now, simple regex extraction demo
    const fields:any = {}
    const buyerMatch = text.match(/buyer[s]?:?\s*([A-Za-z ,]+)/i)
    if(buyerMatch) fields.buyer_names = buyerMatch[1].split(',').map((s:string)=>s.trim())
    const sellerMatch = text.match(/seller[s]?:?\s*([A-Za-z ,]+)/i)
    if(sellerMatch) fields.seller_names = sellerMatch[1].split(',').map((s:string)=>s.trim())
    const priceMatch = text.match(/\$?([0-9,]+)\s*(?:sale|price)?/i)
    if(priceMatch) fields.sale_price = Number(priceMatch[1].replace(/,/g,''))

    // TODO: call OpenAI function-calling with RF401 schema

    // Save as deal_document in Supabase (deferred to client for auth) - return fields to client
    return NextResponse.json({ fields, saved: false })
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status:500 })
  }
}
