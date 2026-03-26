import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'

export const maxDuration = 60

function stripCitations(text: string): string {
  return text
    .replace(/【[^】]*】/g, '')
    .replace(/^\[RF FORM\]\s*/i, '')
    .replace(/^\[TN LAW\]\s*/i, '')
    .replace(/^\[BEST PRACTICE\]\s*/i, '')
    .replace(/^\[MLS RULE\]\s*/i, '')
    .trim()
}

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // no-op in read-only server contexts
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await buildRevaContext(supabase, user.id)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are Reva, an expert Tennessee real estate
transaction coordinator AI. Generate a morning briefing
based on the live data provided. Be specific with
addresses and dates. Under 150 words. No generic
statements. If nothing is urgent, say so plainly.

${context}`,
        },
        {
          role: 'user',
          content: 'Generate my morning briefing for today.',
        },
      ],
    })

    return Response.json({
      briefing: stripCitations(completion.choices[0].message.content ?? ''),
    })
  } catch (err) {
    console.error('Reva briefing error:', err)
    return Response.json(
      { briefing: 'Unable to generate briefing right now. Please try again.' },
      { status: 500 }
    )
  }
}
