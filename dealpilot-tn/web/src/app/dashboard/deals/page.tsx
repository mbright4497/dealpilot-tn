'use client'
import React, {useEffect, useState} from 'react'
import { useRouter } from 'next/navigation'
import TransactionList from '@/components/TransactionList'
import { createClient } from '@supabase/supabase-js'

const supabase = typeof window==='undefined' ? null : null

export default function DealsPage(){
  const router = useRouter()
  const [transactions,setTransactions]=useState([])
  useEffect(()=>{
    async function load(){
      try{
        // call server API route to fetch deals to avoid exposing keys in client
        const res = await fetch('/api/deals')
        if(!res.ok) return
        const data = await res.json()
        const mapped = data.map((d:any)=>({ id:d.id, address:d.title||d.address||'', client:d.client_name||'', type:d.type||'', status:d.status||'Draft', binding:d.binding_date||'', closing:d.closing_date||'' }))
        setTransactions(mapped)
      }catch(e){console.error(e)}
    }
    load()
  },[])

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={()=>router.push('/dashboard/deals/new')} className="px-3 py-2 bg-orange-500 text-white rounded">+ Add Deal</button>
      </div>
      <TransactionList transactions={transactions} onOpenDeal={(id:number)=>router.push(`/dashboard/deals/${id}`)} onViewChecklist={(id:number)=>router.push(`/dashboard/checklists?deal=${id}`)} />
    </div>
  )
}
