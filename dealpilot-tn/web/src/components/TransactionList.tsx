'use client'
import React, { useState } from 'react'

interface Transaction {
  id: number
  address: string
  client: string
  type: string
  status: string
  binding: string
  closing: string
}

interface Props {
  transactions: Transaction[]
  onViewChecklist: (txId: number) => void
  onOpenDeal?: (txId: number) => void
}

export default function TransactionList({ transactions, onViewChecklist, onOpenDeal }: Props) {
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<number | null>(null)
  const list = transactions.filter(m => filter === 'All' || m.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Active Transactions</h2>
        <div className="flex items-center gap-3">
          <select onChange={e => setFilter(e.target.value)} className="border border-gray-300 rounded p-2 text-gray-800 font-medium">
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Closed</option>
          </select>
          <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-semibold">Add New Transaction</button>
        </div>
      </div>
      <table className="w-full bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-left text-sm font-bold text-white">Address</th>
            <th className="p-3 text-left text-sm font-bold text-white">Client</th>
            <th className="p-3 text-left text-sm font-bold text-white">Type</th>
            <th className="p-3 text-left text-sm font-bold text-white">Status</th>
            <th className="p-3 text-left text-sm font-bold text-white">Binding</th>
            <th className="p-3 text-left text-sm font-bold text-white">Closing</th>
            <th className="p-3 text-left text-sm font-bold text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(l => (
            <React.Fragment key={l.id}>
              <tr
                className="border-b hover:bg-orange-50 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === l.id ? null : l.id)}
              >
                <td className="p-3 font-semibold text-gray-900">{l.address}</td>
                <td className="p-3 text-gray-800 font-medium">{l.client}</td>
                <td className="p-3 text-gray-800 font-medium">{l.type}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    l.status === 'Active' ? 'bg-green-100 text-green-800' :
                    l.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{l.status}</span>
                </td>
                <td className="p-3 text-gray-800 font-medium">{l.binding}</td>
                <td className="p-3 text-gray-800 font-medium">{l.closing}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {onOpenDeal && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenDeal(l.id) }}
                        className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors font-semibold"
                      >Open Deal</button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewChecklist(l.id) }}
                      className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors font-semibold"
                    >Checklist</button>
                  </div>
                </td>
              </tr>
              {expanded === l.id && (
                <tr>
                  <td colSpan={7} className="p-4 bg-orange-50 border-b">
                    <div className="text-sm text-gray-800">
                      <p className="font-bold text-gray-900 mb-2 text-base">{l.address}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <p>Client: <span className="font-bold text-gray-900">{l.client}</span></p>
                        <p>Type: <span className="font-bold text-gray-900">{l.type}</span></p>
                        <p>Binding: <span className="font-bold text-gray-900">{l.binding}</span></p>
                        <p>Closing: <span className="font-bold text-gray-900">{l.closing}</span></p>
                      </div>
                      <div className="flex gap-2">
                        {onOpenDeal && (
                          <button
                            onClick={() => onOpenDeal(l.id)}
                            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-semibold"
                          >Open Full Deal Hub</button>
                        )}
                        <button
                          onClick={() => onViewChecklist(l.id)}
                          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors font-semibold"
                        >Transaction Checklist</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
