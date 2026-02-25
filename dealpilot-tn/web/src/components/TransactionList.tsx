'use client'
import React, {useState} from 'react'

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
}

export default function TransactionList({ transactions, onViewChecklist }: Props){
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<number|null>(null)
  const list = transactions.filter(m=> filter==='All' || m.status===filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Transactions</h2>
        <div className="flex items-center gap-3">
          <select onChange={e=>setFilter(e.target.value)} className="border border-gray-300 rounded p-2 text-gray-700">
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Closed</option>
          </select>
          <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Add New Transaction</button>
        </div>
      </div>

      <table className="w-full bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Address</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Client</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Type</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Binding Date</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Closing Date</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(l=> (
            <React.Fragment key={l.id}>
              <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={()=>setExpanded(expanded===l.id?null:l.id)}>
                <td className="p-3 font-medium">{l.address}</td>
                <td className="p-3">{l.client}</td>
                <td className="p-3">{l.type}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    l.status==='Active' ? 'bg-green-100 text-green-700' :
                    l.status==='Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{l.status}</span>
                </td>
                <td className="p-3 text-gray-600">{l.binding}</td>
                <td className="p-3 text-gray-600">{l.closing}</td>
                <td className="p-3">
                  <button
                    onClick={(e)=>{ e.stopPropagation(); onViewChecklist(l.id) }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >Checklist</button>
                </td>
              </tr>
              {expanded===l.id && (
                <tr>
                  <td colSpan={7} className="p-4 bg-gray-50 border-b">
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold text-gray-800 mb-2">Transaction Details - {l.address}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <p>Client: <span className="font-medium text-gray-800">{l.client}</span></p>
                        <p>Type: <span className="font-medium text-gray-800">{l.type}</span></p>
                        <p>Binding: <span className="font-medium text-gray-800">{l.binding}</span></p>
                        <p>Closing: <span className="font-medium text-gray-800">{l.closing}</span></p>
                      </div>
                      <button
                        onClick={()=>onViewChecklist(l.id)}
                        className="mt-3 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      >Open Transaction Checklist</button>
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
