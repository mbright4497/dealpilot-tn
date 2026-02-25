'use client'
import React, {useState} from 'react'

const MOCK = [
  {id:1,address:'123 Maple St, Johnson City, TN', client:'Alice', type:'Buyer', status:'Active', binding:'2026-02-01', closing:'2026-03-05'},
  {id:2,address:'45 Oak Ln, Kingsport, TN', client:'Bob', type:'Seller', status:'Pending', binding:'2026-02-10', closing:'2026-04-01'},
  {id:3,address:'78 Pine Rd, Bristol, TN', client:'Carol', type:'Buyer', status:'Active', binding:'2026-02-15', closing:'2026-04-20'},
]

export default function TransactionList({onOpenDeal}:{onOpenDeal?:(txId:number)=>void}){
  const [filter,setFilter]=useState('All')
  const [expanded,setExpanded]=useState<number|null>(null)
  const list = MOCK.filter(m=> filter==='All' || m.status===filter)
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Transactions</h2>
        <div>
          <select onChange={e=>setFilter(e.target.value)} className="border p-2">
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Closed</option>
          </select>
          <button className="ml-2 p-2 bg-orange-500 text-white rounded">Add New Transaction</button>
        </div>
      </div>

      <table className="w-full bg-white shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Address</th>
            <th>Client</th>
            <th>Type</th>
            <th>Status</th>
            <th>Binding Date</th>
            <th>Closing Date</th>
            <th>Next Deadline</th>
          </tr>
        </thead>
        <tbody>
          {list.map(l=> (
            <React.Fragment key={l.id}>
            <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>setExpanded(expanded===l.id?null:l.id)}>
              <td className="p-2">{l.address}</td>
              <td>{l.client}</td>
              <td>{l.type}</td>
              <td>{l.status==='Active'?<span className="text-green-600">Active</span>:<span>{l.status}</span>}</td>
              <td>{l.binding}</td>
              <td>{l.closing}</td>
              <td>Inspection End: 2026-02-11</td>
            </tr>
            {expanded===l.id && <tr><td colSpan={7} className="p-4 bg-gray-50">Details & timeline for {l.address}</td></tr>}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
