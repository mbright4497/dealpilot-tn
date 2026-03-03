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
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Documents</h2>
          {docLoading ? (
            <p>Loading documents...</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.name} className="flex justify-between bg-[#0f3460] p-2 rounded"> 
                  {doc.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {activeTab === "timeline" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <ul className="space-y-2 text-gray-300">
            <li>Binding Date: {editData.binding}</li>
            <li>Closing Date: {editData.closing}</li>
          </ul>
        </div>
      )}
      {activeTab === "contract" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Contract Upload</h2>
          <input type="file" className="mb-4" />
          <div className="bg-[#0f3460] p-4 rounded text-gray-400">AI Extraction Placeholder</div>
        </div>
      )}
      {activeTab === "assistant" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">EVA Assistant</h2>
          <div className="bg-[#0f3460] p-4 rounded">Transaction-scoped AI chat coming here.</div>
        </div>
      )}
    </div>
  )
}
