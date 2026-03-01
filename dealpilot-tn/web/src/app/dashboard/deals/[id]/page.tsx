"use client"
// Deal Detail page – triggered Vercel rebuild

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DeadlineTimeline from '../../../../components/DeadlineTimeline'
import dynamic from 'next/dynamic'
const TransactionDetail = dynamic(() => import('../../../../components/TransactionDetail'), { ssr: false })
import ErrorBoundary from '../../../../components/ErrorBoundary'

export default function DealDetail({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient()
  const [deal, setDeal] = React.useState<any>(null)
  const [tab, setTab] = React.useState<'overview'|'documents'|'timeline'|'compliance'>('overview')

  React.useEffect(() => {
    async function load(){
      const { data } = await supabase.from('deals').select('*').eq('id', params.id).single()
      setDeal(data)
    }
    load()
  }, [params.id])

  if(!deal) return <div className="dp-bg-dark p-6 text-white">Loading...</div>

  return (
    <div className="dp-bg-dark min-h-screen text-white p-6">
      <h1 className="text-2xl font-bold">{deal.title || 'Deal'}</h1>
      <div className="mt-4">
        <nav className="flex gap-4">
          <button onClick={()=>setTab('overview')} className="px-3 py-1 rounded" aria-pressed={tab==='overview'}>Overview</button>
          <button onClick={()=>setTab('documents')} className="px-3 py-1 rounded">Documents</button>
          <button onClick={()=>setTab('timeline')} className="px-3 py-1 rounded">Timeline</button>
          <button onClick={()=>setTab('compliance')} className="px-3 py-1 rounded">Compliance</button>
        </nav>
      </div>

      <div className="mt-6">
        {tab==='overview' && (
          <div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl">{deal.title}</h2>
                  <div className="text-sm text-gray-300">Status: <span className="font-semibold">{deal.status}</span></div>
                  <div className="mt-2">Value: ${deal.price || deal.value || deal.sale_price || '—'}</div>
                  <div>Address: {deal.address || deal.property?.address || deal.title || '—'}</div>
                  <div>Loan: {deal.loan_type || deal.loanType || '—'}</div>
                  <div>Binding: {deal.binding_date || deal.binding_agreement_date || deal.binding || '—'}</div>
                  <div>Closing: {deal.closing_date || deal.closing || '—'}</div>
                </div>
                <div>
                  <h3 className="font-semibold">Quick actions</h3>
                  <div className="flex flex-col gap-2 mt-2">
                    <button className="dp-btn">Start RF401</button>
                    <button className="dp-btn">Add Document</button>
                    <button className="dp-btn">Mark Phase</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg">Parties</h3>
              <div className="bg-gray-800 p-3 rounded">
                <div><strong>Buyers:</strong> {deal.buyer_names?.join(', ') || '—'}</div>
                <div><strong>Sellers:</strong> {deal.seller_names?.join(', ') || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {tab==='documents' && (
          <div>
            <DocumentsList dealId={params.id} />
          </div>
        )}

        {tab==='timeline' && (
          <DeadlineTimeline dealId={params.id} />
        )}

        {tab==='compliance' && (
          <CompliancePanel dealId={params.id} />
        )}

        {/* New: TransactionDetail wrapped in ErrorBoundary for safety */}
        <div className="mt-6">
          <ErrorBoundary>
            <TransactionDetail transaction={{ id: Number(params.id), address: deal.address || deal.title || 'Deal', client: deal.client || deal.agent || 'Unknown', type: deal.type || 'Unknown', status: deal.status || 'Unknown', contacts: deal.contacts || [] }} onBack={()=>{}} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}


function DocumentsList({dealId}:{dealId:string}){
  const supabase = createClientComponentClient()
  const [docs, setDocs] = React.useState<any[]>([])
  React.useEffect(()=>{async function load(){const {data} = await supabase.from('deal_documents').select('*').eq('deal_id',dealId); setDocs(data||[])} load()},[dealId])
  return (<div className="bg-gray-800 p-4 rounded">{docs.length===0? <div>No documents</div>: docs.map(d=> <div key={d.id} className="p-2 border-b">{d.template_id} — {d.status}</div>)}</div>)
}

function CompliancePanel({dealId}:{dealId:string}){
  const supabase = createClientComponentClient()
  const [checks, setChecks] = React.useState<any[]>([])
  React.useEffect(()=>{async function load(){const {data} = await supabase.from('compliance_checks').select('*').eq('deal_id',dealId); setChecks(data||[])} load()},[dealId])
  return (<div className="bg-gray-800 p-4 rounded">{checks.map(c=> <div key={c.id} className={`p-2 ${c.status==='fail'?'text-red-400':''}`}>{c.check_type} — {c.status}</div>)}</div>)
}
