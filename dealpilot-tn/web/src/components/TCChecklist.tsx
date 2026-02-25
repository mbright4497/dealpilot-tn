'use client'
import React, {useState, useEffect} from 'react'
import { createChecklistInstance, checklistProgress } from '@/lib/tc-checklist'

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
  selectedTxId: number | null
  onSelectTx: (id: number | null) => void
  onBack: () => void
}

export default function TCChecklist({ transactions, selectedTxId, onSelectTx, onBack }: Props){
  // Per-transaction checklists stored as a map
  const [checklists, setChecklists] = useState<Record<number, any[]>>({})

  // Initialize checklists for all transactions on mount
  useEffect(() => {
    const initial: Record<number, any[]> = {}
    transactions.forEach(tx => {
      if (!checklists[tx.id]) {
        initial[tx.id] = createChecklistInstance()
      }
    })
    if (Object.keys(initial).length > 0) {
      setChecklists(prev => ({ ...prev, ...initial }))
    }
  }, [transactions])

  function toggleItem(txId: number, key: string){
    setChecklists(prev => {
      const list = [...(prev[txId] || [])]
      const idx = list.findIndex(c => c.key === key)
      if (idx === -1) return prev
      list[idx] = {
        ...list[idx],
        status: list[idx].status === 'done' ? 'todo' : 'done',
        updated_at: new Date().toISOString()
      }
      return { ...prev, [txId]: list }
    })
  }

  function getProgress(txId: number): number {
    const list = checklists[txId]
    if (!list || list.length === 0) return 0
    return checklistProgress(list)
  }

  const selectedTx = transactions.find(t => t.id === selectedTxId)
  const selectedList = selectedTxId ? (checklists[selectedTxId] || []) : []

  // OVERVIEW: Show all transactions with their checklist progress
  if (!selectedTxId) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Transaction Checklists</h2>
        <p className="text-sm text-gray-500 mb-6">Select a transaction to view and manage its checklist.</p>
        <div className="grid gap-4">
          {transactions.map(tx => {
            const progress = getProgress(tx.id)
            return (
              <div
                key={tx.id}
                onClick={() => onSelectTx(tx.id)}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{tx.address}</h3>
                    <p className="text-sm text-gray-500">{tx.client} - {tx.type} - <span className={tx.status==='Active'?'text-green-600':'text-yellow-600'}>{tx.status}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-500">{progress}%</div>
                    <div className="text-xs text-gray-400">complete</div>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-200 h-2 rounded">
                  <div className="bg-orange-500 h-2 rounded transition-all" style={{width: `${progress}%`}}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // DETAIL: Show selected transaction's checklist
  const progress = getProgress(selectedTxId)
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onSelectTx(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition-colors">Back to All</button>
        <button onClick={onBack} className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm transition-colors">Back to Transactions</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{selectedTx?.address}</h2>
        <p className="text-sm text-gray-500">{selectedTx?.client} - {selectedTx?.type} | Binding: {selectedTx?.binding} | Closing: {selectedTx?.closing}</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">Progress</span>
          <span className="text-sm font-bold text-orange-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 h-3 rounded">
          <div className="bg-orange-500 h-3 rounded transition-all" style={{width: `${progress}%`}}></div>
        </div>
      </div>

      <div className="grid gap-2">
        {selectedList.map(item => (
          <div key={item.key} className="p-3 bg-white shadow rounded flex items-center justify-between border border-gray-100 hover:border-gray-300 transition-colors">
            <div>
              <div className="font-bold text-gray-900">{item.title}</div>
              <div className="text-xs text-gray-400">{item.updated_at}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.status==='done'}
                  onChange={()=>toggleItem(selectedTxId, item.key)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className={`text-sm font-medium ${item.status==='done'?'text-green-600':'text-gray-500'}`}>
                  {item.status==='done' ? 'Complete' : 'Pending'}
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
