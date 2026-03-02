'use client'

interface PortfolioHealth {
  healthy: number
  attention: number
  at_risk: number
  closing_soon: number
  inspection_expiring: number
  overall_status: 'healthy' | 'attention' | 'at_risk'
}

export default function PortfolioActionSummary({
  portfolio,
}: {
  portfolio: PortfolioHealth | null
}) {
  if (!portfolio) return null

  const statusMessage =
    portfolio.overall_status === 'at_risk'
      ? 'Portfolio requires immediate review.'
      : portfolio.overall_status === 'attention'
      ? 'Portfolio requires attention.'
      : 'Portfolio is stable.'

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">
        {statusMessage}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="At Risk" value={portfolio.at_risk} color="red" />
        <Metric label="Needs Attention" value={portfolio.attention} color="yellow" />
        <Metric label="Closing Soon" value={portfolio.closing_soon} color="blue" />
        <Metric label="Inspection Expiring" value={portfolio.inspection_expiring} color="orange" />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'red' | 'yellow' | 'blue' | 'orange'
}) {
  const styles = {
    red: 'border-red-300 bg-red-50 text-red-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    blue: 'border-blue-300 bg-blue-50 text-blue-700',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
  }

  return (
    <div className={`rounded-xl border p-5 ${styles[color]}`}>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}
