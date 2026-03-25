"use client"

import React from "react"
import type { DocumentDefinition } from "@/lib/transaction-phases"

export default function DocumentComplianceBar({
  requiredTotal,
  doneCount,
  docs,
  documentsReceived,
  onToggleDocument,
}: {
  requiredTotal: number
  doneCount: number
  docs: DocumentDefinition[]
  documentsReceived: Record<string, boolean>
  onToggleDocument: (docKey: string) => void
}) {
  const pct = requiredTotal === 0 ? 100 : Math.round((doneCount / requiredTotal) * 100)
  const colorClass = pct > 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-600'

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">Document Compliance</div>
        <div className="text-xs text-gray-300">{doneCount}/{requiredTotal}</div>
      </div>

      <div className="w-full bg-gray-800 h-3 rounded mb-3 overflow-hidden">
        <div className={`${colorClass} h-3`} style={{ width: `${pct}%` }} />
      </div>

      {docs && docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((d) => {
            const isReceived = !!documentsReceived[d.key]
            return (
            <button
              key={d.key}
              onClick={() => onToggleDocument(d.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                isReceived
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#F97316]/10 border-[#F97316]/30 text-[#F97316]'
              }`}
            >
              {d.title} {isReceived ? '· received' : '· missing'}
            </button>
          )})}
        </div>
      )}
    </div>
  )
}
