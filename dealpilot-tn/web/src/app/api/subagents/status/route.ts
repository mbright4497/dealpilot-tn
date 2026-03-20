import { NextResponse } from 'next/server'

// Lightweight stub: integrates with OpenClaw subagents list if available
export async function GET(){
  try{
    // Call out to local orchestration endpoint or return placeholder statuses
    // For now return registry keys with placeholder state
    const placeholder = {
      "000": { status: 'idle', task: null, lastSeen: null },
      "100": { status: 'idle', task: null, lastSeen: null },
      "110": { status: 'idle', task: null, lastSeen: null },
      "200": { status: 'idle', task: null, lastSeen: null },
      "300": { status: 'idle', task: null, lastSeen: null },
      "400": { status: 'idle', task: null, lastSeen: null },
      "500": { status: 'idle', task: null, lastSeen: null },
      "900": { status: 'offline', task: null, lastSeen: null }
    }
    return NextResponse.json(placeholder)
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
