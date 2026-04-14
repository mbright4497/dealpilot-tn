import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DEFAULT_ZIP, fetchWeatherForecast, fetchWeatherForZip } from '@/lib/weather/openMeteo'

export const dynamic = 'force-dynamic'

export async function GET() {
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
              // read-only
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

    let zip = DEFAULT_ZIP
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('zip')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileErr) {
      const z = profile?.zip
      if (typeof z === 'string' && z.trim()) {
        zip = z.trim()
      }
    }

    let weather = await fetchWeatherForecast()
    if (!weather) {
      const fallback = await fetchWeatherForZip(zip)
      if (!fallback) {
        return Response.json({ weather: null, zip })
      }
      weather = { locationLabel: fallback.locationLabel, current: fallback, daily: [] }
    }
    return Response.json({ weather, zip })
  } catch (err) {
    console.error('Weather API error:', err)
    return Response.json({ weather: null, error: 'Weather unavailable' }, { status: 200 })
  }
}
