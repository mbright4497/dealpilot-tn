"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Transaction } from "@/lib/types/transaction"

type TabKey = "overview" | "contract" | "documents" | "timeline" | "assistant"

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "contract", label: "Contract" },
  { key: "documents", label: "Documents" },
  { key: "timeline", label: "Timeline" },
  { key: "assistant", label: "Assistant" },
]

const STATUS_OPTIONS = ["Active", "Pending", "Under Contract", "Closed", "Cancelled"]
const TYPE_OPTIONS = ["Buyer", "Seller"]

const LIFECYCLE_STEPS = ["Contract", "Inspection", "Appraisal", "Title", "Closing"]

export default function DealDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
    const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [editData, setEditData] = useState<Partial<Transaction>>({})
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [saving, setSaving] = useState(false)

  const [documents, setDocuments] = useState<any[]>([])
  const [docLoading, setDocLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

      setTransaction(data as Transaction)
      setEditData(data as Transaction)
      setLoading(false)
    }

    load()
  }, [params.id])

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

  const lifecycleIndex = useMemo(() => {
    if (!editData.status) return 0
    const s = editData.status.toLowerCase()
    if (s.includes("contract")) return 0
    if (s.includes("inspection")) return 1
    if (s.includes("appraisal")) return 2
    if (s.includes("title")) return 3
    if (s.includes("closed")) return 4
    return 0
  }, [editData.status])

  async function handleSave() {
    if (!transaction) return
    setSaving(true)

    const { error } = await supabase
      .from("transactions")
      .update(editData)
      .eq("id", transaction.id)

    if (error) {
      setToast({ message: error.message, type: "error" })
    } else {
      setToast({ message: "Deal updated successfully.", type: "success" })
    }

    setSaving(false)
  }

  async function loadDocuments() {
    if (!transaction) return
    setDocLoading(true)

    const { data } = await supabase.storage
      .from("deal-documents")
      .list(transaction.id)

    setDocuments(data || [])
    setDocLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!transaction || !e.target.files?.[0]) return
    setUploading(true)

    const file = e.target.files[0]
    const filePath = `${transaction.id}/${file.name}`

    const { error } = await supabase.storage
      .from("deal-documents")
      .upload(filePath, file, { upsert: true })

    if (error) {
      setToast({ message: error.message, type: "error" })
    } else {
      setToast({ message: "Document uploaded.", type: "success" })
      loadDocuments()
    }

    setUploading(false)
  }

  async function handleDelete(name: string) {
    if (!transaction) return
    const { error } = await supabase.storage
      .from("deal-documents")
      .remove([`${transaction.id}/${name}`])

    if (error) {
      setToast({ message: error.message, type: "error" })
    } else {
      setToast({ message: "Document deleted.", type: "success" })
      loadDocuments()
    }
  }

  useEffect(() => {
    if (activeTab === "documents") loadDocuments()
  }, [activeTab])

  if (loading)
    return <div className="bg-[#1a1a2e] text-white p-8 min-h-screen">Loading...</div>

  if (error || !transaction)
    return <div className="bg-[#1a1a2e] text-red-400 p-8 min-h-screen">{error}</div>

  return (
    <div className="bg-[#1a1a2e] min-h-screen text-white p-6 space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded shadow-lg ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => router.push("/dashboard/deals")} className="text-orange-500">
          ← Back
        </button>
        <button onClick={handleSave} className="bg-orange-500 px-4 py-2 rounded text-black">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
        <h1 className="text-2xl font-bold">{editData.address}</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400">Address</label>
            <input value={editData.address || ""} onChange={e => setEditData({...editData,address:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded"/>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Client</label>
            <input value={editData.client || ""} onChange={e => setEditData({...editData,client:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded"/>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Type</label>
            <select value={editData.type || ""} onChange={e => setEditData({...editData,type:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded">
              {TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Status</label>
            <select value={editData.status || ""} onChange={e => setEditData({...editData,status:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded">
              {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Binding Date</label>
            <input type="date" value={editData.binding || ""} onChange={e => setEditData({...editData,binding:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded"/>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Closing Date</label>
            <input type="date" value={editData.closing || ""} onChange={e => setEditData({...editData,closing:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400">Notes</label>
            <textarea value={editData.notes || ""} onChange={e => setEditData({...editData,notes:e.target.value})} className="w-full bg-[#0f3460] p-2 rounded"/>
          </div>
        </div>

        {/* Lifecycle */}
        <div className="flex justify-between mt-6">
          {LIFECYCLE_STEPS.map((step, index) => (
            <div key={step} className="flex-1 text-center">
              <div className={`mx-auto w-6 h-6 rounded-full ${
                index <= lifecycleIndex ? "bg-orange-500" : "bg-gray-600"
              }`} />
              <p className="text-xs mt-2">{step}</p>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="bg-[#0f3460] p-4 rounded mt-6">
          <h3 className="font-semibold">Financial Summary</h3>
          <p className="text-gray-400 text-sm">Purchase price, commission, escrow, and loan summary will appear here.</p>
        </div>
      </div>

      {activeTab === "documents" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <input type="file" onChange={handleUpload} disabled={uploading}/>
          {docLoading ? <p>Loading...</p> : (
            <ul className="mt-4 space-y-2">
              {documents.map(doc => (
                <li key={doc.name} className="flex justify-between bg-[#0f3460] p-2 rounded">
                  {doc.name}
                  <button onClick={() => handleDelete(doc.name)} className="text-red-400">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <ul className="space-y-3">
            <li>📄 Contract Signed: {editData.binding}</li>
            <li>🔍 Inspection Period</li>
            <li>🏦 Appraisal Ordered</li>
            <li>📑 Title Work</li>
            <li>🏁 Closing: {editData.closing}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
```
