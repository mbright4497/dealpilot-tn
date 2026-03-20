import { NextResponse } from 'next/server'
import subagents from '@/data/subagents.json'

export async function GET(){
  try{
    return NextResponse.json(subagents)
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
