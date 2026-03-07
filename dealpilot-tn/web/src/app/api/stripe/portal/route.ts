import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { STRIPE_SECRET_KEY } = process.env
    if (!STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    return NextResponse.json({ url: '/pricing' })
  } catch (e:any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }
}
