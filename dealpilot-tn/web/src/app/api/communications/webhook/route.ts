import {NextResponse} from 'next/server'
export async function POST(req:Request){
  try{
    const payload=await req.json()
    // TODO: parse GHL webhook payloads (SMS received, email reply), normalize and insert into Supabase 'communications' table.
    console.log('GHL webhook payload:', JSON.stringify(payload))
    return NextResponse.json({ok:true}, {status:200})
  }catch(e){
    return NextResponse.json({error:'invalid json'}, {status:400})
  }
}
