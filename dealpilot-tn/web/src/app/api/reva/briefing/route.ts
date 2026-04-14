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
import {
  TN_PLAYBOOK,
  calculateTriggerDate,
  evaluateConditions,
} from '@/lib/documents/tnPlaybook'

export const maxDuration = 60

interface PlayAction {
  transactionId: number
  address: string
  playId: string
  playName: string
  phase: string
  contactRole: string
  channel: string
  actionType: string
  message: string
  priority: number
  checkWeather: boolean
  relatedRfForm?: string
  status: 'due_today' | 'overdue' | 'upcoming_3_days'
}

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

    const { data: allDeals } = await supabase
      .from('transactions')
      .select(
        'id, address, client, status, closing_date, binding_date, binding_agreement_date, contacts, loan_type, earnest_money, purchase_price, inspection_period_days, resolution_period_days, rf401_wizard, has_hoa, hoa_name'
      )
      .eq('user_id', userId)
      .neq('status', 'deleted')

    const calendarToday = new Date()
    calendarToday.setHours(0, 0, 0, 0)

    const playActions: PlayAction[] = []

    for (const deal of allDeals || []) {
      if (
        deal.status === 'closed' ||
        deal.status === 'cancelled' ||
        deal.status === 'withdrawn'
      ) {
        continue
      }

      const bindingDate =
        deal.binding_agreement_date || deal.binding_date || null
      const closingDate = deal.closing_date || null
      const contacts = (deal.contacts || []) as Record<string, unknown>[]
      const rfWizard = (deal.rf401_wizard || {}) as Record<string, unknown>

      const txnData: Record<string, unknown> = {
        contacts,
        loan_type: deal.loan_type || rfWizard.loan_type || null,
        financing_contingency_waived:
          rfWizard.financing_contingency_waived || false,
        appraisal_contingent:
          rfWizard.appraisal_contingent || rfWizard.appraisal_contingency || true,
        inspection_waived: rfWizard.inspection_waived || false,
        has_hoa: !!(deal.has_hoa || deal.hoa_name || rfWizard.hoa_name),
        lead_based_paint: rfWizard.lead_based_paint || false,
        possession_at_closing: rfWizard.possession_at_closing !== false,
        earnest_money_days: rfWizard.earnest_money_days || 3,
      }

      const inspDays =
        deal.inspection_period_days ||
        (rfWizard.inspection_period_days != null
          ? Number(rfWizard.inspection_period_days)
          : 0) ||
        14
      let inspectionEndDate: string | null = null
      if (bindingDate) {
        const ipe = new Date(String(bindingDate) + 'T12:00:00')
        ipe.setDate(ipe.getDate() + Number(inspDays))
        inspectionEndDate = ipe.toISOString().split('T')[0]
      }

      const closingDateObj = closingDate
        ? new Date(String(closingDate) + 'T12:00:00')
        : null
      const daysToClose =
        closingDateObj && !Number.isNaN(closingDateObj.getTime())
          ? Math.ceil(
              (closingDateObj.getTime() - calendarToday.getTime()) / 86400000
            )
          : null

      const agentName = firstName || 'your agent'

      for (const play of TN_PLAYBOOK) {
        if (
          play.trigger.type === 'event' ||
          play.trigger.type === 'state_entry' ||
          play.trigger.type === 'deadline_passed'
        ) {
          continue
        }

        if (!evaluateConditions(play, txnData)) continue

        const triggerDate = calculateTriggerDate(
          play,
          bindingDate ? String(bindingDate) : null,
          closingDate ? String(closingDate) : null,
          inspectionEndDate
        )
        if (!triggerDate) continue

        triggerDate.setHours(0, 0, 0, 0)

        const diffDays = Math.ceil(
          (triggerDate.getTime() - calendarToday.getTime()) / 86400000
        )

        let status: PlayAction['status'] | null = null
        if (diffDays < 0) status = 'overdue'
        else if (diffDays === 0) status = 'due_today'
        else if (diffDays <= 3) status = 'upcoming_3_days'

        if (!status) continue

        const buyerNames =
          deal.client ||
          (Array.isArray(contacts)
            ? contacts
                .filter((c) =>
                  String((c as { role?: string }).role || '')
                    .toLowerCase()
                    .includes('buyer')
                )
                .map((c) => String((c as { name?: string }).name || ''))
                .filter(Boolean)
                .join(', ')
            : '') ||
          'the buyer'
        const deadlineDate = triggerDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })

        const resolvedMessage = play.vera_message
          .replace(/\{\{property_address\}\}/g, deal.address || 'the property')
          .replace(/\{\{buyer_names\}\}/g, buyerNames)
          .replace(/\{\{seller_names\}\}/g, 'the seller')
          .replace(/\{\{closing_date\}\}/g, closingDate || 'TBD')
          .replace(/\{\{agent_name\}\}/g, agentName)
          .replace(/\{\{contact_name\}\}/g, '{{contact_name}}')
          .replace(/\{\{deadline_date\}\}/g, deadlineDate)
          .replace(
            /\{\{days_remaining\}\}/g,
            daysToClose !== null ? String(daysToClose) : '?'
          )
          .replace(/\{\{binding_date\}\}/g, bindingDate || 'NOT SET')
          .replace(
            /\{\{purchase_price\}\}/g,
            deal.purchase_price
              ? `$${Number(deal.purchase_price).toLocaleString()}`
              : 'TBD'
          )
          .replace(
            /\{\{earnest_money\}\}/g,
            deal.earnest_money
              ? `$${Number(deal.earnest_money).toLocaleString()}`
              : 'TBD'
          )
          .replace(/\{\{inspection_end_date\}\}/g, inspectionEndDate || 'TBD')
          .replace(
            /\{\{earnest_money_days\}\}/g,
            String(txnData.earnest_money_days ?? 3)
          )
          .replace(
            /\{\{loan_type\}\}/g,
            String(txnData.loan_type || 'conventional')
          )
          .replace(
            /\{\{resolution_period_days\}\}/g,
            String(
              deal.resolution_period_days ||
                rfWizard.resolution_period_days ||
                5
            )
          )

        playActions.push({
          transactionId: deal.id,
          address: deal.address || 'Unknown',
          playId: play.id,
          playName: play.name,
          phase: play.phase,
          contactRole: play.contact_role,
          channel: play.channel,
          actionType: play.action_type,
          message: resolvedMessage,
          priority: play.priority,
          checkWeather: play.check_weather,
          relatedRfForm: play.related_rf_form || undefined,
          status,
        })
      }
    }

    const statusOrder = { overdue: 0, due_today: 1, upcoming_3_days: 2 }
    playActions.sort((a, b) => {
      const so = statusOrder[a.status] - statusOrder[b.status]
      if (so !== 0) return so
      return a.priority - b.priority
    })

    let playbookBlock = ''
    if (playActions.length > 0) {
      const lines = playActions.slice(0, 15).map((a) => {
        const tag =
          a.status === 'overdue'
            ? '🔴 OVERDUE'
            : a.status === 'due_today'
              ? '🟡 DUE TODAY'
              : '🔵 UPCOMING'
        const weatherNote =
          a.checkWeather && forecast?.daily?.length
            ? ` (Weather: check forecast for outdoor activity)`
            : ''
        return `[${tag}] ${a.address} — ${a.playName} → ${a.contactRole} (${a.channel})${weatherNote}${a.relatedRfForm ? ` | Form: ${a.relatedRfForm}` : ''}`
      })
      playbookBlock = `\nVERA'S PLAYBOOK — Action items from the RF708 timeline:\n${lines.join('\n')}\n\nIncorporate these action items into your briefing. For overdue items, flag them urgently. For due-today items, mention them as priorities. For upcoming items, mention only if relevant.\n`
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

${weatherBlock ? `${weatherBlock}\n\n` : ''}${playbookBlock}
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
      playbook: playActions,
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
        playbook: [],
        weather: null,
      },
      { status: 500 }
    )
  }
}
