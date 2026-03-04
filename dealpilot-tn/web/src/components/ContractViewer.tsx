'use client'

import React from 'react'
import {
  Home,
  Users,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react'

type ContractData = {
  propertyAddress: string
  buyers: string
  sellers: string
  purchasePrice: number
  earnestMoney: number
  closingDate: string
  inspectionStart?: string
  inspectionEnd?: string
  financingDate?: string
  specialStipulations?: string
}

type Props = {
  contract: ContractData
}

function formatCurrency(value?: number) {
  if (!value) return '$0'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  })
}

function InfoCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-[#0f223a] border border-white/10 rounded-lg p-4">

      <div className="flex items-center gap-2 text-gray-300 text-xs mb-2">
        <Icon size={14} />
        {label}
      </div>

      <div className="text-white font-medium text-sm">
        {value || '—'}
      </div>

    </div>
  )
}

export default function ContractViewer({ contract }: Props) {
  return (
    <div className="bg-[#0a1929] border border-white/10 rounded-xl p-6">

      {/* Header */}

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-white text-lg font-semibold">
          RF401 Contract Summary
        </h2>

        <span className="text-xs text-gray-400">
          Tennessee Purchase & Sale
        </span>

      </div>

      {/* Grid */}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        <InfoCard
          icon={Home}
          label="Property Address"
          value={contract.propertyAddress}
        />

        <InfoCard
          icon={Users}
          label="Buyers"
          value={contract.buyers}
        />

        <InfoCard
          icon={Users}
          label="Sellers"
          value={contract.sellers}
        />

        <InfoCard
          icon={DollarSign}
          label="Purchase Price"
          value={formatCurrency(contract.purchasePrice)}
        />

        <InfoCard
          icon={DollarSign}
          label="Earnest Money"
          value={formatCurrency(contract.earnestMoney)}
        />

        <InfoCard
          icon={Calendar}
          label="Closing Date"
          value={contract.closingDate}
        />

        <InfoCard
          icon={Calendar}
          label="Inspection Period"
          value={
            contract.inspectionStart && contract.inspectionEnd
              ? `${contract.inspectionStart} → ${contract.inspectionEnd}`
              : '—'
          }
        />

        <InfoCard
          icon={Calendar}
          label="Financing Contingency"
          value={contract.financingDate}
        />

      </div>

      {/* Special Stips */}

      <div className="mt-6">

        <div className="bg-[#0f223a] border border-white/10 rounded-lg p-4">

          <div className="flex items-center gap-2 text-gray-300 text-xs mb-2">
            <FileText size={14} />
            Special Stipulations
          </div>

          <div className="text-white text-sm whitespace-pre-line">
            {contract.specialStipulations || 'None'}
          </div>

        </div>

      </div>

    </div>
  )
}
