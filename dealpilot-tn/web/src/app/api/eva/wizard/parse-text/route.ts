import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request){
  try{
    const { text } = await req.json()
    if(!text) return NextResponse.json({ error: 'no text' }, { status: 400 })
    // naive extraction: address = phrase after 'at', price = $X, buyer names after 'buyer' or 'buyer:'
    const res: any = {}
    const atMatch = text.match(/at ([A-Za-z0-9\s.,#-]+)/i)
    if(atMatch) res.propertyAddress = atMatch[1].trim()
    const priceMatch = text.match(/\$?([0-9,]+)k?/i)
    if(priceMatch) res.purchasePrice = Number(priceMatch[1].replace(/,/g,''))
    const buyerMatch = text.match(/buyer[s]?[:]?\s*([A-Za-z ,]+)/i)
    if(buyerMatch) res.buyerNames = [buyerMatch[1].trim()]
    const closingMatch = text.match(/closing(?: on)?\s([A-Za-z0-9\s,-]+)/i)
    if(closingMatch) res.closingDate = closingMatch[1].trim()
    return NextResponse.json(res)
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
