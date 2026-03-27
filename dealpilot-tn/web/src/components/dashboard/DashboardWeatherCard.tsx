import type { WeatherSnapshot } from '@/lib/weather/openMeteo'

export function DashboardWeatherCard({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="mb-4 rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-4 text-left shadow-lg shadow-black/20">
      <div className="text-sm font-medium text-sky-200/90">📍 {weather.locationLabel}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl" aria-hidden>
          {weather.emoji}
        </span>
        <span className="text-xl font-semibold text-white">{weather.tempF}°F</span>
        <span className="text-base text-gray-200">{weather.condition}</span>
      </div>
      <div className="mt-1 text-sm text-gray-400">Wind: {weather.windMph} mph</div>
      <div className="mt-2 text-sm text-gray-500">{weather.dateLine}</div>
    </div>
  )
}
