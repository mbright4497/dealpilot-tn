'use client'
import React, {useState, useEffect} from 'react'
import DealPickerModal from './DealPickerModal'
import ClosingPilotLogo from '@/components/ClosingPilotLogo'

export default function RookWizard({transactionId, onClose}:{transactionId?:string,onClose:()=>void}){
  const [open, setOpen] = useState(true)
  const [step, setStep] = useState(0)
  const [deals, setDeals] = useState<any[]>([])
  const [selected, setSelected] = useState<any|null>(null)

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await fetch('/api/transactions')
        if(res.ok){ const j = await res.json(); setDeals(Array.isArray(j)?j:[]) }
      }catch(e){}
    })()
  },[])

  useEffect(()=>{ if(transactionId && !selected){ (async ()=>{ try{ const r = await fetch(`/api/deal-state/${transactionId}`); if(r.ok){ setSelected(await r.json()) } }catch(e){} })() } },[transactionId])

  const close = ()=>{ setOpen(false); onClose() }

  return (
    open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-3xl bg-[#071224] rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ClosingPilotLogo size="sm" />
              <div>
                <h3 className="text-white font-semibold">RF401 Buyer Wizard</h3>
                <p className="text-sm text-gray-400">Guided document creation for RF401</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">Step {step+1} / 4</div>
          </div>

          <div className="bg-[#0b1a2b] rounded p-4 min-h-[220px]">
            {step===0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Connect a Deal</h4>
                {selected ? (
                  <div className="text-gray-200">Connected to: <span className="text-white font-medium">{selected.address}</span></div>
                ) : (
                  <div className="text-gray-400">No deal selected. Click below to pick an existing deal to connect.</div>
                )}
                <div className="mt-4">
                  <button onClick={()=>{/* open picker via event */ window.dispatchEvent(new CustomEvent('rookwizard:open'))}} className="px-4 py-2 bg-orange-500 text-black rounded">Select a deal</button>
                </div>
              </div>
            )}
            {step===1 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Verify Parties</h4>
                <div className="text-gray-400">Review buyer and seller names and edit if necessary.</div>
              </div>
            )}
            {step===2 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Fill RF401</h4>
                <div className="text-gray-400">Enter closing date, purchase price, earnest money, and stipulations.</div>
              </div>
            )}
            {step===3 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Review & Generate</h4>
                <div className="text-gray-400">Preview the generated RF401 and export when ready.</div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <button onClick={()=>{ if(step>0) setStep(s=>s-1) }} disabled={step===0} className="px-3 py-2 rounded bg-gray-800 text-gray-300">Back</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={close} className="px-3 py-2 rounded bg-gray-700 text-gray-200">Close</button>
              <button onClick={()=>{ if(step<3) setStep(s=>s+1); else close() }} className="px-4 py-2 rounded bg-orange-500 text-black">{step<3 ? 'Next' : 'Finalize & Export'}</button>
            </div>
          </div>
        </div>
      </div>
    ) : null
  )
}
