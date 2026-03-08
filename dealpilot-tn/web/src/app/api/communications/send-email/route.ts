export const dynamic = 'force-dynamic'
import {NextResponse} from 'next/server'
export async function POST(req:Request){
  try{
    const body=await req.json()
    const {to,subject,body:content,dealId}=body
    if(!to || !content) return NextResponse.json({error:'missing to or body'}, {status:400})
    // TODO: integrate with GHL/SendGrid/Resend to send email. Save message to Supabase.
    return NextResponse.json({ok:true, provider:'mock', to, subject, dealId}, {status:200})
  }catch(e){
    return NextResponse.json({error:'invalid json'}, {status:400})
  }
}
