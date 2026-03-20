import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataPath = path.join(process.cwd(), 'src', 'app', 'api', 'jobs', 'data.json')

export async function GET(){
  try{
    const raw = fs.readFileSync(dataPath, 'utf8')
    return NextResponse.json(JSON.parse(raw))
  }catch(e:any){ return NextResponse.json([], { status: 200 }) }
}

export async function POST(req: Request){
  try{
    const body = await req.json()
    const raw = fs.readFileSync(dataPath, 'utf8')
    const jobs = JSON.parse(raw || '[]')
    const id = `job-${Date.now()}`
    const job = { id, status: 'pending', createdAt: new Date().toISOString(), payload: body }
    jobs.push(job)
    fs.writeFileSync(dataPath, JSON.stringify(jobs, null, 2))
    return NextResponse.json(job, { status: 201 })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
