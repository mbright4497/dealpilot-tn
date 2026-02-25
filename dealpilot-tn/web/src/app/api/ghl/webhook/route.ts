import { NextResponse } from 'next/server'

export async function POST(req: Request){
  try{
    const body = await req.json()
    // Example: handle opportunity created/updated
    // Validate signature/token from headers if provided
    const event = body.event || body.type || 'unknown'
    // If opportunity-> create deal
    if(body.opportunity){
      const opp = body.opportunity
      // create deal via Supabase (requires service key) - placeholder: emit log
      console.log('GHL opportunity webhook', opp)
    }
    return NextResponse.json({received:true})
  }catch(e){
    return NextResponse.json({error:String(e)},{status:500})
  }
}
