import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'
import { DEFAULT_ZIP, fetchWeatherForZip } from '@/lib/weather/openMeteo'

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
    const userId = user.id
    const userEmail = user.email

    const { count: activeTransactionCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const hasNoActiveTransactions = (activeTransactionCount ?? 0) === 0
    const context = await buildRevaContext(supabase, userId, undefined, userEmail)

    const now = new Date()
    const hour = now.getHours()
    const greeting =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const todayLong = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    let zipForWeather = DEFAULT_ZIP
    const { data: zipRow, error: zipErr } = await supabase
      .from('profiles')
      .select('zip')
      .eq('id', userId)
      .maybeSingle()
    if (!zipErr && typeof zipRow?.zip === 'string' && zipRow.zip.trim()) {
      zipForWeather = zipRow.zip.trim()
    }

    const firstNameRaw = profileRow?.full_name?.trim()
    const firstName = firstNameRaw
      ? firstNameRaw.split(/\s+/)[0]
      : String(userEmail || '')
          .split('@')[0]
          ?.trim() || 'there'

    let weatherBlock = ''
    const wx = await fetchWeatherForZip(zipForWeather)
    if (wx) {
      weatherBlock = `Current weather in agent's area: ${wx.tempF}°F, ${wx.condition}
Reference location for small talk: ${wx.locationLabel}.`
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are Reva, an expert Tennessee real estate
transaction coordinator AI. Generate a concise briefing
based on the live data provided. Be specific with
addresses and dates. Under 150 words. No generic
statements. If nothing is urgent, say so plainly.

Start with "${greeting}, ${firstName}." based on the current time. Today is ${todayLong}.

${weatherBlock ? `${weatherBlock}\n` : ''}You may briefly reference the weather when it helps set context (e.g. showing houses).

If this user has no active transactions, generate a warm welcome briefing that:
- Greets them by name (using the time-appropriate greeting above)
- Explains what ClosingPilot can do for them
- Tells them their first step is to add a transaction
- Mentions they can ask Reva anything about TN real estate
- Is under 100 words and encouraging in tone

${context}`,
        },
        {
          role: 'user',
          content: hasNoActiveTransactions
            ? 'Generate my onboarding briefing for today.'
            : 'Generate my briefing for today.',
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
