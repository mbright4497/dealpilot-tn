'use client'
import React from 'react'

interface Transaction {
  id: number
  address: string
  client: string
  status: string
}

interface Props {
  transactions?: Transaction[]
  onOpenDeal?: (txId: number) => void
  onViewChecklist?: (txId: number) => void
  onNavigate?: (view: string) => void
}

export default function TCDashboard({ transactions = [], onOpenDeal, onViewChecklist, onNavigate }: Props) {
  const stats = { activeDeals: transactions.length || 3, upcomingDeadlines: 5, pendingTasks: 8, completed: 12 }
  const activities = [
    'Earnest money received for 123 Maple St',
    'Inspection completed for 45 Oak Ln',
    'Appraisal ordered for 78 Pine Rd',
    'Title commitment received for 123 Maple St',
    'Final walkthrough scheduled for 45 Oak Ln',
  ]

  function handleStartNewTransaction() {
    if (onNavigate) onNavigate('transactions')
  }

  function handleCalculateDeadlines() {
    if (onNavigate) onNavigate('deadlines')
  }

  function handleFillRF401() {
    if (onNavigate) onNavigate('forms')
  }

  function handleViewChecklist() {
    if (transactions.length > 0 && onOpenDeal) {
      onOpenDeal(transactions[0].id)
    } else if (onViewChecklist) {
      onViewChecklist(1)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded border-l-4 border-orange-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate && onNavigate('transactions')}>
          <div className="text-sm font-semibold text-gray-600">Active Deals</div>
          <div className="text-3xl font-bold text-gray-900">{stats.activeDeals}</div>
        </div>
        <div className="p-4 bg-white shadow rounded border-l-4 border-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate && onNavigate('deadlines')}>
          <div className="text-sm font-semibold text-gray-600">Upcoming Deadlines</div>
          <div className="text-3xl font-bold text-gray-900">{stats.upcomingDeadlines}</div>
        </div>
        <div className="p-4 bg-white shadow rounded border-l-4 border-yellow-500">
          <div className="text-sm font-semibold text-gray-600">Pending Tasks</div>
          <div className="text-3xl font-bold text-gray-900">{stats.pendingTasks}</div>
        </div>
        <div className="p-4 bg-white shadow rounded border-l-4 border-green-500">
          <div className="text-sm font-semibold text-gray-600">Completed This Month</div>
          <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 shadow rounded">
          <h3 className="font-bold text-gray-900 mb-3 text-base">Recent Activity</h3>
          <ul className="text-sm text-gray-800">
            {activities.map((a, i) => (
              <li key={i} className="py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-900">{a}</span>
                <div className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h3 className="font-bold text-gray-900 mb-3 text-base">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleStartNewTransaction}
              className="w-full p-3 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-semibold text-sm text-left px-4"
            >
              + Start New Transaction
            </button>
            <button
              onClick={handleCalculateDeadlines}
              className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold text-sm text-left px-4"
            >
              Calculate Deadlines
            </button>
            <button
              onClick={handleFillRF401}
              className="w-full p-3 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-semibold text-sm text-left px-4"
            >
              Fill RF401 Form
            </button>
            <button
              onClick={handleViewChecklist}
              className="w-full p-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold text-sm text-left px-4"
            >
              View Checklist
            </button>
          </div>
          {transactions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Open a Deal</h4>
              <div className="space-y-2">
                {transactions.map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => onOpenDeal && onOpenDeal(tx.id)}
                    className="w-full p-2 text-left bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                  >
                    <div className="text-sm font-semibold text-gray-900">{tx.address}</div>
                    <div className="text-xs text-gray-600">{tx.client} &bull; <span className={tx.status === 'Active' ? 'text-green-700' : 'text-yellow-700'}>{tx.status}</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
