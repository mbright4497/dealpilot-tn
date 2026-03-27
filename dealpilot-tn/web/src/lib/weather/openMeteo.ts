/** Open-Meteo (no API key). Used for dashboard weather and Reva briefing context. */

export const DEFAULT_ZIP = '37601'

const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
}

export function weatherCodeToEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code >= 1 && code <= 3) return '⛅'
  if (code === 45 || code === 48) return '🌫️'
  if (code === 51 || code === 53 || code === 55) return '🌦️'
  if (code === 61 || code === 63 || code === 65) return '🌧️'
  if (code === 71 || code === 73 || code === 75) return '❄️'
  if (code === 80 || code === 81 || code === 82) return '🌧️'
  if (code === 95 || code === 96 || code === 99) return '⛈️'
  return '🌡️'
}

/** Human-readable condition for UI and Reva prompt */
export function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear'
  if (code >= 1 && code <= 3) return 'Partly Cloudy'
  if (code === 45 || code === 48) return 'Foggy'
  if (code === 51 || code === 53 || code === 55) return 'Drizzle'
  if (code === 61 || code === 63 || code === 65) return 'Rain'
  if (code === 71 || code === 73 || code === 75) return 'Snow'
  if (code === 80 || code === 81 || code === 82) return 'Showers'
  if (code === 95 || code === 96 || code === 99) return 'Thunderstorm'
  return 'Mixed conditions'
}

function formatPlaceName(name: string, admin1: string | undefined, countryCode: string | undefined): string {
  if (countryCode === 'US' && admin1) {
    const abbr = US_STATE_ABBR[admin1] || admin1
    return `${name}, ${abbr}`
  }
  if (admin1) return `${name}, ${admin1}`
  return name
}

export type WeatherSnapshot = {
  locationLabel: string
  tempF: number
  weathercode: number
  condition: string
  emoji: string
  windMph: number
  /** e.g. "Friday, March 27" */
  dateLine: string
}

export async function fetchWeatherForZip(zip: string): Promise<WeatherSnapshot | null> {
  const z = (zip || DEFAULT_ZIP).trim() || DEFAULT_ZIP
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(z)}&count=1&language=en&format=json`
  let geoRes: Response
  try {
    geoRes = await fetch(geoUrl)
  } catch {
    return null
  }
  if (!geoRes.ok) return null
  const geo = (await geoRes.json()) as { results?: Array<Record<string, unknown>> }
  const hit = geo.results?.[0] as
    | {
        name?: string
        latitude?: number
        longitude?: number
        admin1?: string
        country_code?: string
      }
    | undefined
  if (!hit?.latitude || !hit?.longitude || !hit.name) return null

  const locationLabel = formatPlaceName(hit.name, hit.admin1, hit.country_code)

  const lat = hit.latitude
  const lon = hit.longitude
  const wxUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph'

  let wxRes: Response
  try {
    wxRes = await fetch(wxUrl)
  } catch {
    return null
  }
  if (!wxRes.ok) return null
  const wx = (await wxRes.json()) as {
    current?: { temperature_2m?: number; weathercode?: number; windspeed_10m?: number }
  }
  const cur = wx.current
  if (!cur || cur.temperature_2m == null || cur.weathercode == null) return null

  const weathercode = Number(cur.weathercode)
  const now = new Date()
  const dateLine = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return {
    locationLabel,
    tempF: Math.round(cur.temperature_2m),
    weathercode,
    condition: weatherCodeToCondition(weathercode),
    emoji: weatherCodeToEmoji(weathercode),
    windMph: Math.round(cur.windspeed_10m ?? 0),
    dateLine,
  }
}
