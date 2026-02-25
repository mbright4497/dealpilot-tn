'use client'
import React from 'react'

interface Transaction {
  id: number
  address: string
  client: string
  status: string
  type?: string
  binding?: string
  closing?: string
}

interface Props {
  transactions?: Transaction[]
  onOpenDeal?: (txId: number) => void
  onViewChecklist?: (txId: number) => void
  onNavigate?: (view: string) => void
}

export default function TCDashboard({ transactions = [], onOpenDeal, onViewChecklist, onNavigate }: Props) {
  const active = transactions.filter(t => t.status === 'Active').length
  const pending = transactions.filter(t => t.status === 'Pending').length
  const total = transactions.length

  const activities = [
    { text: 'Earnest money received for 123 Maple St', time: '2 hours ago', icon: '💰' },
    { text: 'Inspection completed for 45 Oak Ln', time: '4 hours ago', icon: '🔍' },
    { text: 'Appraisal ordered for 78 Pine Rd', time: '6 hours ago', icon: '📋' },
    { text: 'Title commitment received for 123 Maple St', time: '1 day ago', icon: '📄' },
    { text: 'Final walkthrough scheduled for 45 Oak Ln', time: '1 day ago', icon: '🏠' },
  ]

  const upcomingDeadlines = [
    { task: 'Inspection Period Ends', deal: '123 Maple St', date: 'Feb 28', urgent: true },
    { task: 'Financing Contingency', deal: '45 Oak Ln', date: 'Mar 3', urgent: true },
    { task: 'Appraisal Due', deal: '78 Pine Rd', date: 'Mar 8', urgent: false },
    { task: 'Title Review', deal: '123 Maple St', date: 'Mar 10', urgent: false },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, Matt</h2>
            <p className="text-gray-300 mt-1">Here is what is happening with your transactions today.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate && onNavigate('transactions')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium text-sm"
            >+ New Transaction</button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📊</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">+2 this week</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500 mt-1">Total Transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🟢</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">On Track</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{active}</p>
          <p className="text-sm text-gray-500 mt-1">Active Deals</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⏳</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-600">Needs Attention</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pending}</p>
          <p className="text-sm text-gray-500 mt-1">Pending Deals</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⚡</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">2 urgent</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{upcomingDeadlines.length}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming Deadlines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Active Transactions</h3>
              <p className="text-sm text-gray-500">{total} deals in your pipeline</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('transactions')}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >View All &rarr;</button>
          </div>
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => {
              const progress = tx.status === 'Active' ? 45 : tx.status === 'Pending' ? 70 : 100
              return (
                <div
                  key={tx.id}
                  onClick={() => onOpenDeal && onOpenDeal(tx.id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                        tx.status === 'Active' ? 'bg-green-500' :
                        tx.status === 'Pending' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}>
                        {tx.type === 'Buyer' ? 'B' : tx.type === 'Seller' ? 'S' : '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.address}</p>
                        <p className="text-sm text-gray-500">{tx.client} &middot; {tx.type || 'Transaction'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      tx.status === 'Active' ? 'bg-green-50 text-green-700' :
                      tx.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{tx.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          tx.status === 'Active' ? 'bg-green-500' :
                          tx.status === 'Pending' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{progress}% complete</span>
                  </div>
                  {tx.closing && (
                    <p className="text-xs text-gray-400 mt-1.5">Closing: {tx.closing}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
              <button
                onClick={() => onNavigate && onNavigate('deadlines')}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >View All &rarr;</button>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingDeadlines.map((d, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${d.urgent ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.task}</p>
                    <p className="text-xs text-gray-500">{d.deal}</p>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${d.urgent ? 'text-red-600' : 'text-gray-500'}`}>{d.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate && onNavigate('transactions')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📝</span> Start New Transaction
              </button>
              <button
                onClick={() => onNavigate && onNavigate('deadlines')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📅</span> Calculate Deadlines
              </button>
              <button
                onClick={() => onNavigate && onNavigate('forms')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-green-50 hover:text-green-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📄</span> Fill RF401 Form
              </button>
              <button
                onClick={() => onNavigate && onNavigate('checklist')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>✅</span> View Checklists
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-500">Latest updates across all your transactions</p>
        </div>
        <div className="divide-y divide-gray-50">
          {activities.map((a, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <span className="text-lg">{a.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{a.text}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
