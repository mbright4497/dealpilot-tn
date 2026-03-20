import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataPath = path.join(process.cwd(), 'src', 'app', 'api', 'jobs', 'data.json')

export async function POST(req: Request){
  try{
    const body = await req.json()
    // body: { agentId }
    const raw = fs.readFileSync(dataPath, 'utf8')
    const jobs = JSON.parse(raw || '[]')
    const next = jobs.find((j:any)=> j.status === 'pending')
    if(!next) return NextResponse.json({ message: 'no job' }, { status: 204 })
    next.status = 'running'
    next.claimedBy = body.agentId || 'unknown'
    next.startedAt = new Date().toISOString()
    fs.writeFileSync(dataPath, JSON.stringify(jobs, null, 2))
    return NextResponse.json(next)
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
