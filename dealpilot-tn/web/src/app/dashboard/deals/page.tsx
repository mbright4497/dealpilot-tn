'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import TransactionList from '@/components/TransactionList'
import { useDeals } from '@/lib/hooks'

export default function DealsPage(){
  const router = useRouter()
  const { data } = useDeals()
  const deals = data?.data || []
  const mapped = deals.map((d:any)=>({ id:d.id, address:d.title||d.address||'', client:d.client_name||'', type:d.type||'', status:d.status||'Draft', binding:d.binding_date||'', closing:d.closing_date||'' }))

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={()=>router.push('/dashboard/deals/new')} className="px-3 py-2 bg-orange-500 text-white rounded">+ Add Deal</button>
      </div>
      <TransactionList transactions={mapped} onOpenDeal={(id:number)=>router.push(f`/dashboard/deals/${id}`)} onViewChecklist={(id:number)=>router.push(`/dashboard/checklists?deal=${id}`)} />
    </div>
  )
}
