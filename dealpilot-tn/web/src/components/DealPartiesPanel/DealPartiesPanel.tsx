import React from 'react';

export default function DealPartiesPanel({ transactionId }: { transactionId?: number }){
  return (
    <div className="bg-slate-800 text-slate-100 p-4 rounded-md shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Deal Parties</h3>
        <div className="text-sm text-slate-400">Transaction #{transactionId || '—'}</div>
      </div>
      <div className="space-y-2">
        <div className="animate-pulse bg-slate-700 h-10 rounded" />
        <div className="animate-pulse bg-slate-700 h-10 rounded" />
      </div>
    </div>
  )
}
