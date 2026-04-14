import type { WeatherSnapshot, DayForecast } from '@/lib/weather/openMeteo'

type Props = {
  weather: WeatherSnapshot
  daily?: DayForecast[]
}

export function DashboardWeatherCard({ weather, daily }: Props) {
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

      {daily && daily.length > 0 && (
        <div className="mt-3 -mx-1">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label="10-day forecast"
          >
            {daily.map((day, index) => (
              <div
                key={day.date}
                role="listitem"
                className={`flex w-16 shrink-0 flex-col items-center rounded-lg border px-1.5 py-2 text-center ${
                  index === 0
                    ? 'border-sky-500/35 bg-[#0d2038]'
                    : 'border-[#1e3a5f]/80 bg-[#081222]'
                }`}
              >
                <div className="text-[11px] font-medium text-gray-300">{day.dayOfWeek.slice(0, 3)}</div>
                <span className="text-lg leading-none" aria-hidden>
                  {day.emoji}
                </span>
                <div className="mt-0.5 text-xs leading-tight">
                  <span className="font-bold text-white">{day.highF}°</span>{' '}
                  <span className="text-gray-500">{day.lowF}°</span>
                </div>
                {day.precipChance > 0 && (
                  <div className="mt-0.5 text-[10px] font-medium text-sky-300/90">{day.precipChance}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
