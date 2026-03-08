export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // In real app, verify signature with STRIPE_WEBHOOK_SECRET
    const event = await req.json()
    // handle minimal events
    const type = event.type || 'unknown'
    console.log('stripe webhook received:', type)
    return NextResponse.json({ received: true })
  } catch (e:any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }
}
