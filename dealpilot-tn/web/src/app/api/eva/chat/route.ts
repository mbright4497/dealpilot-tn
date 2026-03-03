import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try{
    const body = await req.json()
    const message = body.message || ''
    const context = body.context || {}

    // Placeholder smart response - no OpenAI key required for Phase 1
    let reply = `Thanks — I looked at your request. I can help with that. Here are 1-2 suggested next steps:\n\n`;
    if(context.dealId){
      reply += `I can prepare a quick summary for deal ${context.dealId}. Would you like a valuation or a checklist?`
    } else if(message.toLowerCase().includes('deadlines')){
      reply = `I see upcoming deadlines: Inspection in 7 days, Appraisal in 14 days. Recommend confirming availability with the buyer.`
    } else {
      reply += `Quick action: (1) Review deal summary. (2) Ask me to check deadlines or draft an email.`
    }

    // optional renderPayload example
    const renderPayload = { type: 'deal_summary', summary: 'Placeholder deal summary for preview.' }

    return NextResponse.json({ reply, renderPayload })
  }catch(err:any){
    return NextResponse.json({ reply: 'EVA is unavailable right now.' }, { status:500 })
  }
}
