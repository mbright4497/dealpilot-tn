export const dynamic = 'force-dynamic'
import {NextResponse} from 'next/server'
export async function GET(){
  // TODO: fetch real conversation history from Supabase for requested deal/user
  const mock=[
    {id:1,from:'John Doe',to:'agent',message:'Is the house available?',ts:Date.now()-1000*60*5},
    {id:2,from:'agent',to:'John Doe',message:'Yes — we can show it tomorrow 5pm',ts:Date.now()-1000*60*3}
  ]
  return NextResponse.json({ok:true,history:mock}, {status:200})
}
