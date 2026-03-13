'use client'
import React from 'react'
import TransactionList from '@/components/TransactionList'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function TransactionsPage(){
  const [transactions,setTransactions] = React.useState<any[]>([])
  const router = useRouter()
  React.useEffect(()=>{ let mounted=true; (async ()=>{ try{ const res = await fetch('/api/transactions'); if(!mounted) return; if(res.ok){ const j = await res.json(); setTransactions(Array.isArray(j)? j : j.results || []) } }catch(e){ if(mounted) setTransactions([]) } })(); return ()=>{ mounted=false } },[])
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-4">Transactions</h1><div class="mt-2"><a href="/chat" class="text-sm text-gray-400 hover:text-white">← Back to Dashboard</a></div><TransactionList transactions={transactions} onViewChecklist={()=>{}} onOpenDeal={(id:number)=>{ router.push(`/chat?deal=${id}`) }} onAddTransaction={()=>{}} onDeleteTransaction={async (id:number)=>{ if(!confirm('Delete this transaction? This cannot be undone.')) return; try{ const res = await fetch('/api/transactions/'+id, { method: 'DELETE' }); if(res.ok) setTransactions(prev=>prev.filter((t:any)=>t.id!==id)) }catch(e){}}} /></div>)
}
