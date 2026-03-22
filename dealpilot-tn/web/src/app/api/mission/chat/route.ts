export const dynamic='force-dynamic'
import{NextResponse}from'next/server'
import{createClient}from'@supabase/supabase-js'
const SB_URL=process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY!
const OC_GW=process.env.OPENCLAW_GATEWAY_URL||'http://localhost:3015'
const OC_SECRET=process.env.OPENCLAW_WEBHOOK_SECRET||''
/* GET /api/mission/chat - load last 50 messages */
export async function GET(){
  const sb=createClient(SB_URL,SB_KEY)
  const{data,error}=await sb.from('mission_chat').select('*').order('created_at',{ascending:true}).limit(50)
  if(error)return NextResponse.json({messages:[]},{status:200})
  return NextResponse.json({messages:data||[]})
}
/* POST /api/mission/chat - send message, route to Tango via OpenClaw */
export async function POST(req:Request){
  try{
    const{text,sender='You'}=await req.json()
    if(!text?.trim())return NextResponse.json({error:'empty'},{status:400})
    const sb=createClient(SB_URL,SB_KEY)
    // save user message
    await sb.from('mission_chat').insert({sender,text,role:'user'})
    // fire to Tango via OpenClaw bridge
    let tangoReply='(Tango is thinking...)'
    try{
      const headers:any={'Content-Type':'application/json'}
      if(OC_SECRET)headers['Authorization']=`Bearer ${OC_SECRET}`
      const res=await fetch(`${OC_GW}/hooks/agent`,{
        method:'POST',headers,
        body:JSON.stringify({
          message:`[Mission Control Chat] ${text}`,
          name:`mc-chat-${Date.now()}`,
          mode:'now'
        }),
        signal:AbortSignal.timeout(8000)
      })
      if(res.ok){const d=await res.json().catch(()=>({}))
        tangoReply=d?.reply||d?.message||'Roger. On it.'}
    }catch(e:any){
      tangoReply=`Received. Command logged. (OpenClaw offline: ${e.message})`
    }
    // save Tango reply
    await sb.from('mission_chat').insert({sender:'Tango',text:tangoReply,role:'agent'})
    // update Tango activity log
    await sb.from('agent_activity_log').insert({agent_id:'tango',event_type:'command',source:'mission_control',payload:{chat:text,reply:tangoReply}}).catch(()=>{})
    const{data}=await sb.from('mission_chat').select('*').order('created_at',{ascending:true}).limit(50)
    return NextResponse.json({messages:data||[],reply:tangoReply})
  }catch(e:any){
    return NextResponse.json({error:String(e?.message)},{status:500})
  }
}
