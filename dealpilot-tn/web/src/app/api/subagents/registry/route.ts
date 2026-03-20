import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(){
  try{
    const base = path.resolve(process.cwd(), '..', '..', '..') // repo root from web/ folder
    const p = path.join(base, 'SUBAGENTS.md')
    const jsonPath = path.join(base, '.openclaw', 'subagents.json')
    if(fs.existsSync(jsonPath)){
      const raw = fs.readFileSync(jsonPath, 'utf8')
      return NextResponse.json(JSON.parse(raw))
    }
    // fallback: return basic empty
    return NextResponse.json({})
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
