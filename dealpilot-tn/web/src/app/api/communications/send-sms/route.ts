export const dynamic = 'force-dynamic'
import {NextResponse} from 'next/server'
export async function POST(req:Request){
  try{
    const body=await req.json()
    const {to,message,dealId}=body
    if(!to || !message) return NextResponse.json({error:'missing to or message'}, {status:400})
    // TODO: integrate with GoHighLevel SMS API here. Use stored API key and send SMS. Save record to Supabase.
    return NextResponse.json({ok:true, provider:'mock', to, message, dealId}, {status:200})
  }catch(e){
    return NextResponse.json({error:'invalid json'}, {status:400})
  }
}
