"use client"
import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type TabKey = "overview" | "contract" | "documents" | "timeline" | "assistant"

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "contract", label: "Contract" },
  { key: "documents", label: "Documents" },
  { key: "timeline", label: "Timeline" },
  { key: "assistant", label: "Assistant" },
]

export default function DealDetailPage({ params, }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<any | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [docLoading, setDocLoading] = useState(false)

  // Load Transaction
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setTransaction(data)
      setEditData(data)
      setLoading(false)
    }

    load()
  }, [params.id])

  // Deal Health + Countdown
  const today = new Date()

  const bindingCountdown = useMemo(() => {
    if (!editData.binding) return null
    const diff = new Date(editData.binding).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [editData.binding])

  const closingCountdown = useMemo(() => {
    if (!editData.closing) return null
    const diff = new Date(editData.closing).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [editData.closing])

  const dealHealth = useMemo(() => {
    if (!editData.closing) return "Attention"
    if (closingCountdown && closingCountdown < 0) return "At Risk"
    if (closingCountdown && closingCountdown <= 7) return "Attention"
    return "Healthy"
  }, [closingCountdown])

  // Save Changes
  async function handleSave() {
    if (!transaction) return
    setSaving(true)
    const { error } = await supabase
      .from("transactions")
      .update({
        address: editData.address,
        client: editData.client,
        type: editData.type,
        status: editData.status,
        binding: editData.binding,
        closing: editData.closing,
        notes: editData.notes,
        contacts: editData.contacts,
      })
      .eq("id", transaction.id)

    if (error) {
      alert(error.message)
    } else {
      alert("Deal updated successfully.")
    }

    setSaving(false)
  }

  // Load Documents
  async function loadDocuments() {
    if (!transaction) return
    setDocLoading(true)
    const { data, error } = await supabase.storage
      .from("deal-documents")
      .list(transaction.id)

    if (!error) setDocuments(data || [])
    setDocLoading(false)
  }

  useEffect(() => {
    if (activeTab === "documents") loadDocuments()
  }, [activeTab])

  // Loading & Error States
  if (loading)
    return (
      <div className="bg-[#1a1a2e] text-white p-8 min-h-screen"> Loading deal... </div>
    )

  if (error || !transaction)
    return (
      <div className="bg-[#1a1a2e] text-red-400 p-8 min-h-screen"> Error loading deal: {error} </div>
    )

  return (
    <div className="bg-[#1a1a2e] min-h-screen text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/dashboard/deals")} className="text-orange-500 hover:underline" >
          ← Back to Deals
        </button>
        <button onClick={handleSave} disabled={saving} className="bg-orange-500 px-4 py-2 rounded text-black font-semibold" >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Title */}
      <div className="bg-[#16213e] p-6 rounded-xl">
        <h1 className="text-2xl font-bold">{editData.address}</h1>
        <p className="text-gray-300"> {editData.client} • {editData.type} • {editData.status} </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 pb-2">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`pb-2 ${activeTab === tab.key ? "border-b-2 border-orange-500 text-orange-500" : "text-gray-400"}`} >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editable Fields */}
          <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
            <input value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" placeholder="Address" />
            <input value={editData.client || ""} onChange={(e) => setEditData({ ...editData, client: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" placeholder="Client" />
            <input value={editData.type || ""} onChange={(e) => setEditData({ ...editData, type: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" placeholder="Type" />
            <input value={editData.status || ""} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" placeholder="Status" />
            <textarea value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" placeholder="Notes" />
          </div>

          {/* Key Dates + Health */}
          <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
            <div>
              <label>Binding Date</label>
              <input type="date" value={editData.binding || ""} onChange={(e) => setEditData({ ...editData, binding: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" />
              {bindingCountdown !== null && (
                <p className="text-sm text-gray-400">{bindingCountdown} days</p>
              )}
            </div>

            <div>
              <label>Closing Date</label>
              <input type="date" value={editData.closing || ""} onChange={(e) => setEditData({ ...editData, closing: e.target.value })} className="w-full bg-[#0f3460] p-2 rounded" />
              {closingCountdown !== null && (
                <p className="text-sm text-gray-400">{closingCountdown} days</p>
              )}
            </div>

            <div>
              <span className="font-semibold">Deal Health: </span>
              <span className={`px-3 py-1 rounded ${dealHealth === "Healthy" ? "bg-green-600" : dealHealth === "Attention" ? "bg-yellow-600" : "bg-red-600"}`} >
                {dealHealth}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold mb-2">Documents</h2>

          <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded">
            <div className="mb-3">
              <label className="block mb-1">Upload Documents</label>
              <div className="border-dashed border-2 border-gray-700 p-6 rounded text-center">
                <p className="text-gray-400">Drag & drop files here or click to browse</p>
                <input type="file" multiple onChange={async (e)=>{
                  const files = Array.from(e.target.files || [])
                  if(!transaction) return
                  setDocLoading(true)
                  // naive client-side add - show names
                  const newDocs = files.map(f=>({ name: f.name, size: f.size, uploadedAt: new Date().toISOString(), type: 'other' }))
                  setDocuments(prev=>[...newDocs, ...prev])
                  setDocLoading(false)
                }} className="mt-2" />
              </div>
            </div>

            <div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-gray-400">
                    <th className="p-2">Name</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Uploaded</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-gray-400">No documents for this transaction. Upload files above.</td></tr>
                  ) : (
                    documents.map((doc:any)=> (
                      <tr key={doc.name} className="bg-[#0f3460] mb-2">
                        <td className="p-2">{doc.name}</td>
                        <td className="p-2"><span className="text-xs bg-[#16213e] px-2 py-1 rounded">{doc.type || 'other'}</span></td>
                        <td className="p-2">{doc.uploadedAt ? doc.uploadedAt.slice(0,10) : '-'}</td>
                        <td className="p-2"><button className="text-orange-400">Download</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>

          {/* Timeline component */}
          <div className="flex">
            <div className="w-full">
              {(() => {
                // build milestones
                const milestones: { key: string; label: string; date: string | null; status?: string }[] = []
                const parseDate = (d: any) => (d ? new Date(d) : null)
                const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—")
                const bindingDate = parseDate(editData.binding)
                const closingDate = parseDate(editData.closing)

                if (bindingDate) {
                  milestones.push({ key: 'binding', label: 'Binding Date', date: fmt(bindingDate) })
                  // standard TN deadlines from binding
                  const inspection = new Date(bindingDate)
                  inspection.setDate(inspection.getDate() + 10)
                  milestones.push({ key: 'inspection', label: 'Inspection Period End', date: fmt(inspection) })

                  const titleSearch = new Date(bindingDate)
                  titleSearch.setDate(titleSearch.getDate() + 14)
                  milestones.push({ key: 'title', label: 'Title Search Due', date: fmt(titleSearch) })

                  const appraisal = new Date(bindingDate)
                  appraisal.setDate(appraisal.getDate() + 21)
                  milestones.push({ key: 'appraisal', label: 'Appraisal Due', date: fmt(appraisal) })
                }

                if (closingDate) {
                  milestones.push({ key: 'closing', label: 'Closing Date', date: fmt(closingDate) })
                  const finalWalk = new Date(closingDate)
                  finalWalk.setDate(finalWalk.getDate() - 1)
                  milestones.push({ key: 'final_walk', label: 'Final Walkthrough', date: fmt(finalWalk) })
                }

                // calculate status for each milestone
                const todayDate = new Date()
                const withStatus = milestones.map((m) => {
                  if (!m.date || m.date === '—') return { ...m, status: 'future' }
                  const d = new Date(m.date + 'T00:00:00')
                  const diff = Math.floor((d.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
                  if (diff < 0) return { ...m, status: 'overdue' }
                  if (diff <= 7) return { ...m, status: 'upcoming' }
                  return { ...m, status: 'future' }
                })

                return (
                  <ol className="relative border-l border-gray-700 ml-4">
                    {withStatus.map((m) => {
                      const colorClass = m.status === 'overdue' ? 'bg-red-500' : m.status === 'upcoming' ? 'bg-orange-500' : m.status === 'future' ? 'bg-gray-500' : 'bg-gray-500'
                      const textColor = m.status === 'overdue' ? 'text-red-400' : m.status === 'upcoming' ? 'text-orange-300' : 'text-gray-300'
                      return (
                        <li key={m.key} className="mb-6 ml-6">
                          <span className={`absolute -left-3.5 flex h-6 w-6 items-center justify-center rounded-full ${colorClass} ring-4 ring-[#0f1c2e]`} />
                          <div className="pl-2">
                            <div className={`flex items-center justify-between ${textColor}`}>
                              <div className="font-semibold">{m.label}</div>
                              <div className="text-sm">{m.date}</div>
                            </div>
                            <div className="text-xs text-gray-400">{m.status === 'overdue' ? 'Overdue' : m.status === 'upcoming' ? 'Upcoming' : 'Scheduled'}</div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )
              })()}
            </div>
          </div>

        </div>
      )}

      {activeTab === "contract" && (
        <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold mb-2">Contract</h2>

          {/* File upload */}
          <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded">
            <label className="block mb-2">Upload Contract</label>
            <input type="file" onChange={(e)=>{
              const f = e.target.files?.[0]
              if(!f) return
              // simple client-side preview upload placeholder
              const key = `contract_file_${transaction.id}`
              localStorage.setItem(key, f.name)
              setEditData({...editData, contract_file_name: f.name})
            }} className="mb-3" />
            <div className="text-sm text-gray-300">{editData.contract_file_name ? `Uploaded: ${editData.contract_file_name}` : 'No file uploaded'}</div>
            <div className="mt-3">
              <button className="bg-orange-500 text-black px-3 py-1 rounded" onClick={()=>alert('Contract AI extraction coming soon')}>AI Extraction Placeholder</button>
            </div>
          </div>

          {/* Contract Details */}
          <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded space-y-3">
            <h3 className="font-semibold">Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Purchase Price</label>
                <input type="number" value={editData.contract_details?.purchase_price || ''} onChange={(e)=>{
                  const v = e.target.value
                  const cd = {...(editData.contract_details||{}) , purchase_price: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded" placeholder="$" />
              </div>

              <div>
                <label className="text-sm">Earnest Money</label>
                <input type="number" value={editData.contract_details?.earnest_money || ''} onChange={(e)=>{
                  const v = e.target.value
                  const cd = {...(editData.contract_details||{}) , earnest_money: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded" placeholder="$" />
              </div>

              <div>
                <label className="text-sm">Financing Type</label>
                <select value={editData.contract_details?.financing || ''} onChange={(e)=>{
                  const v = e.target.value
                  const cd = {...(editData.contract_details||{}) , financing: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded">
                  <option value="">Select</option>
                  <option>Conventional</option>
                  <option>VA</option>
                  <option>FHA</option>
                  <option>USDA</option>
                  <option>Cash</option>
                </select>
              </div>

              <div>
                <label className="text-sm">Inspection Period Days</label>
                <input type="number" value={editData.contract_details?.inspection_days ?? 10} onChange={(e)=>{
                  const v = Number(e.target.value)
                  const cd = {...(editData.contract_details||{}) , inspection_days: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded" />
              </div>

              <div>
                <label className="text-sm">Appraisal Contingency</label>
                <div className="mt-1">
                  <label className="inline-flex items-center">
                    <input type="checkbox" checked={!!editData.contract_details?.appraisal_contingency} onChange={(e)=>{
                      const cd = {...(editData.contract_details||{}) , appraisal_contingency: e.target.checked}
                      setEditData({...editData, contract_details: cd})
                    }} className="mr-2" /> Yes
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm">Home Warranty</label>
                <div className="mt-1">
                  <label className="inline-flex items-center">
                    <input type="checkbox" checked={!!editData.contract_details?.home_warranty} onChange={(e)=>{
                      const cd = {...(editData.contract_details||{}) , home_warranty: e.target.checked}
                      setEditData({...editData, contract_details: cd})
                    }} className="mr-2" /> Yes
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm">Closing Cost Credits</label>
                <input type="number" value={editData.contract_details?.closing_credits || ''} onChange={(e)=>{
                  const v = e.target.value
                  const cd = {...(editData.contract_details||{}) , closing_credits: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded" placeholder="$" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm">Special Stipulations</label>
                <textarea value={editData.contract_details?.stipulations || ''} onChange={(e)=>{
                  const v = e.target.value
                  const cd = {...(editData.contract_details||{}) , stipulations: v}
                  setEditData({...editData, contract_details: cd})
                }} className="w-full bg-[#0f3460] p-2 rounded" rows={4} />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={async ()=>{
                // attempt to save contract_details JSON to transactions table
                try{
                  const payload = { contract_details: editData.contract_details }
                  const { error } = await supabase.from('transactions').update(payload).eq('id', transaction.id)
                  if(error){
                    // fallback - store locally
                    localStorage.setItem(`contract_details_${transaction.id}`, JSON.stringify(editData.contract_details))
                    alert('Saved locally (server write unavailable).')
                  } else {
                    alert('Contract details saved.')
                  }
                }catch(err){
                  localStorage.setItem(`contract_details_${transaction.id}`, JSON.stringify(editData.contract_details))
                  alert('Saved locally (exception).')
                }
              }} className="bg-orange-500 text-black px-4 py-2 rounded">Save Contract Details</button>
            </div>
          </div>

        </div>
      )}

      {activeTab === "assistant" && (
        <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold mb-2">EVA Assistant</h2>

          <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded">
            <div className="mb-3 text-gray-300">Eva is scoped to: <span className="font-semibold">{editData.address || 'Unknown'} - {editData.client || 'Unknown'}</span></div>

            <div className="flex gap-2 mb-4">
              <button className="bg-[#0f3460] text-white px-3 py-1 rounded">Check Deadlines</button>
              <button className="bg-[#0f3460] text-white px-3 py-1 rounded">Draft Amendment</button>
              <button className="bg-[#0f3460] text-white px-3 py-1 rounded">Review Checklist</button>
              <button className="bg-[#0f3460] text-white px-3 py-1 rounded">Calculate Net Sheet</button>
            </div>

            <div className="bg-[#0f3460] p-3 rounded h-56 overflow-auto text-gray-200"> 
              {/* Placeholder chat area - preloaded context */}
              <div className="text-sm mb-2 text-gray-400">System Context:</div>
              <pre className="text-xs text-gray-300">{JSON.stringify({
                address: editData.address,
                client: editData.client,
                type: editData.type,
                binding: editData.binding,
                closing: editData.closing,
                status: editData.status,
                notes: editData.notes,
              }, null, 2)}</pre>
            </div>

            <div className="mt-3">
              <input placeholder="Ask Eva about this deal..." className="w-full bg-[#0f3460] p-2 rounded" />
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
