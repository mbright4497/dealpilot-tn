import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'
import {
  DEFAULT_ZIP,
  type WeatherForecast,
  fetchWeatherForecast,
  fetchWeatherForZip,
} from '@/lib/weather/openMeteo'

export const maxDuration = 60

function formatBriefingWeatherBlock(fc: WeatherForecast): string {
  const c = fc.current
  const lines: string[] = [
    `Weather — ${fc.locationLabel}:`,
    `Today: ${c.tempF}°F, ${c.condition}, Wind ${c.windMph}mph`,
    '10-Day Forecast:',
  ]
  for (const d of fc.daily) {
    const shortDate = new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    lines.push(
      `- ${d.dayOfWeek} ${shortDate}: High ${d.highF}°F / Low ${d.lowF}°F, ${d.condition}, ${d.precipChance}% rain, Wind ${d.windMaxMph}mph`,
    )
  }
  return lines.join('\n')
}

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
      .neq('status', 'deleted')

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

    const today = now.toISOString().split('T')[0]

    let weatherBlock = ''
    let forecast: WeatherForecast | null = await fetchWeatherForecast()
    if (!forecast) {
      const wxFallback = await fetchWeatherForZip(zipForWeather)
      if (wxFallback) {
        forecast = { locationLabel: wxFallback.locationLabel, current: wxFallback, daily: [] }
      }
    }
    if (forecast) {
      if (forecast.daily.length > 0) {
        weatherBlock = formatBriefingWeatherBlock(forecast)
      } else {
        const wx = forecast.current
        weatherBlock = `Current weather in agent's area: ${wx.tempF}°F, ${wx.condition}
Reference location for small talk: ${wx.locationLabel}.`
      }
    }

    const systemPrompt = `You are Vera, an expert Tennessee real estate transaction coordinator AI powered by GPT-4o with full access to TN real estate law via your vector store.

CRITICAL DATE AWARENESS:
- Today is ${todayLong} (${today}).
- ANY closing_date, binding_date, or deadline that is BEFORE today is OVERDUE. Flag it immediately.
- Calculate exact days overdue or days remaining for every date you mention.
- NEVER say a past date is "ahead" or "coming up." If it's past, it's OVERDUE.

BRIEFING RULES:
- Start with "${greeting}, ${firstName}."
- Lead with the most urgent item (overdue deadlines first, then upcoming within 7 days).
- For each active deal, state: address, client, days to close (or days overdue), and the #1 action needed.
- If documents are missing, state how many required docs are missing out of total.
- If binding date is NOT SET, flag it as CRITICAL — no contract is enforceable without it.
- Reference weather briefly only if relevant to showings or inspections.
- Under 150 words. No generic filler. Be specific with addresses and numbers.
- If no active transactions, give a warm onboarding welcome under 100 words.

${weatherBlock ? `${weatherBlock}\n\n` : ''}
${context}`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: hasNoActiveTransactions
            ? 'Generate my onboarding briefing for today.'
            : 'Generate my briefing for today.',
        },
      ],
    })

    const { data: allDeals } = await supabase
      .from('transactions')
      .select('id, address, client, status, closing_date, binding_date')
      .eq('user_id', userId)
      .neq('status', 'deleted')

    const dealNow = new Date()
    const dealHealth = (allDeals || []).map((d: {
      id: number
      address: string | null
      client: string | null
      status: string | null
      closing_date: string | null
      binding_date: string | null
    }) => {
      const closing = d.closing_date ? new Date(d.closing_date) : null
      const daysToClose =
        closing && !isNaN(closing.getTime())
          ? Math.floor((closing.getTime() - dealNow.getTime()) / 86400000)
          : null
      return {
        id: d.id,
        address: d.address,
        client: d.client,
        status: d.status,
        daysToClose,
        isOverdue: daysToClose !== null && daysToClose < 0,
        hasBinding: !!d.binding_date,
      }
    })

    return Response.json({
      briefing: stripCitations(completion.choices[0].message.content ?? ''),
      dealHealth,
      weather: forecast
        ? {
            tempF: forecast.current.tempF,
            condition: forecast.current.condition,
            location: forecast.current.locationLabel,
            daily: forecast.daily,
          }
        : null,
    })
  } catch (err) {
    console.error('Reva briefing error:', err)
    return Response.json(
      {
        briefing: 'Unable to generate briefing right now. Please try again.',
        dealHealth: [],
        weather: null,
      },
      { status: 500 }
    )
  }
}
