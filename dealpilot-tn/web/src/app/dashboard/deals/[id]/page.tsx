// web/src/app/dashboard/deals/[id]/page.tsx
"use client"

import React from "react"
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

const STATUS_OPTIONS = ["Active", "Pending", "Under Contract", "Closed", "Cancelled"]
const TYPE_OPTIONS = ["Buyer", "Seller"]
const LIFECYCLE_STEPS = ["Contract", "Inspection", "Appraisal", "Title", "Closing"]

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [transaction, setTransaction] = React.useState<any>(null)
  const [editData, setEditData] = React.useState<any>({})
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview")
  const [saving, setSaving] = React.useState(false)

  const [documents, setDocuments] = React.useState<any[]>([])
  const [docLoading, setDocLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  // -----------------------------
  // Load Transaction
  // -----------------------------
  React.useEffect(() => {
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
      setEditData(data || {})
      setLoading(false)
    }

    load()
  }, [params.id])

  // -----------------------------
  // Date / Health Helpers
  // -----------------------------
  const today = new Date()

  const bindingCountdown = React.useMemo(() => {
    if (!editData?.binding) return null
    const diff = new Date(editData.binding).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [editData?.binding])

  const closingCountdown = React.useMemo(() => {
    if (!editData?.closing) return null
    const diff = new Date(editData.closing).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [editData?.closing])

  const dealHealth = React.useMemo(() => {
    if (!editData?.closing) return "Attention"
    if (typeof closingCountdown === "number" && closingCountdown < 0) return "At Risk"
    if (typeof closingCountdown === "number" && closingCountdown <= 7) return "Attention"
    return "Healthy"
  }, [closingCountdown, editData?.closing])

  // -----------------------------
  // Lifecycle Stepper
  // (basic mapping based on status string; can evolve later)
  // -----------------------------
  const lifecycleIndex = React.useMemo(() => {
    const s = String(editData?.status || "").toLowerCase()
    if (s.includes("cancel")) return 0
    if (s.includes("closed")) return 4
    if (s.includes("under contract")) return 0
    if (s.includes("pending")) return 0
    if (s.includes("active")) return 0
    return 0
  }, [editData?.status])

  // -----------------------------
  // Save Changes
  // -----------------------------
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

  // -----------------------------
  // Documents (Supabase Storage)
  // bucket: deal-documents
  // path: {transaction.id}/{filename}
  // -----------------------------
  async function loadDocuments() {
    if (!transaction) return
    setDocLoading(true)

    const { data, error } = await supabase.storage.from("deal-documents").list(transaction.id)

    if (error) {
      alert(error.message)
      setDocuments([])
    } else {
      setDocuments(data || [])
    }

    setDocLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!transaction) return
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const path = `${transaction.id}/${file.name}`
    const { error } = await supabase.storage.from("deal-documents").upload(path, file, { upsert: true })

    if (error) {
      alert(error.message)
    } else {
      alert("Document uploaded.")
      await loadDocuments()
    }

    // allow re-uploading same filename by resetting input
    e.target.value = ""
    setUploading(false)
  }

  async function handleDeleteDocument(name: string) {
    if (!transaction) return
    const { error } = await supabase.storage
      .from("deal-documents")
      .remove([`${transaction.id}/${name}`])

    if (error) {
      alert(error.message)
    } else {
      alert("Document deleted.")
      await loadDocuments()
    }
  }

  async function handleViewDocument(name: string) {
    if (!transaction) return
    const path = `${transaction.id}/${name}`
    const { data, error } = await supabase.storage.from("deal-documents").createSignedUrl(path, 60)

    if (error) {
      alert(error.message)
      return
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    }
  }

  React.useEffect(() => {
    if (activeTab === "documents") {
      loadDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // -----------------------------
  // Loading & Error States
  // -----------------------------
  if (loading) {
    return (
      <div className="bg-[#1a1a2e] text-white p-8 min-h-screen">
        Loading deal...
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="bg-[#1a1a2e] text-red-400 p-8 min-h-screen">
        Error loading deal: {error || "Not found"}
      </div>
    )
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="bg-[#1a1a2e] min-h-screen text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard/deals")}
          className="text-orange-500 hover:underline"
        >
          ← Back to Deals
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 px-4 py-2 rounded text-black font-semibold"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Title */}
      <div className="bg-[#16213e] p-6 rounded-xl">
        <h1 className="text-2xl font-bold">{editData.address}</h1>
        <p className="text-gray-300">
          {editData.client} • {editData.type} • {editData.status}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 ${
              activeTab === tab.key
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editable Fields */}
          <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Address</label>
              <input
                value={editData.address || ""}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
                placeholder="Address"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Client</label>
              <input
                value={editData.client || ""}
                onChange={(e) => setEditData({ ...editData, client: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
                placeholder="Client"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Type</label>
              <select
                value={editData.type || "Buyer"}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Status</label>
              <select
                value={editData.status || "Active"}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Notes</label>
              <textarea
                value={editData.notes || ""}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded min-h-[120px]"
                placeholder="Notes"
              />
            </div>
          </div>

          {/* Key Dates + Health + Lifecycle */}
          <div className="bg-[#16213e] p-6 rounded-xl space-y-4">
            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Binding Date</label>
              <input
                type="date"
                value={editData.binding || ""}
                onChange={(e) => setEditData({ ...editData, binding: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
              />
              {bindingCountdown !== null && (
                <p className="text-sm text-gray-400">
                  {bindingCountdown} day{bindingCountdown === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-gray-300">Closing Date</label>
              <input
                type="date"
                value={editData.closing || ""}
                onChange={(e) => setEditData({ ...editData, closing: e.target.value })}
                className="w-full bg-[#0f3460] p-2 rounded"
              />
              {closingCountdown !== null && (
                <p className="text-sm text-gray-400">
                  {closingCountdown} day{closingCountdown === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <div>
              <span className="font-semibold">Deal Health: </span>
              <span
                className={`px-3 py-1 rounded ${
                  dealHealth === "Healthy"
                    ? "bg-green-600"
                    : dealHealth === "Attention"
                    ? "bg-yellow-600"
                    : "bg-red-600"
                }`}
              >
                {dealHealth}
              </span>
            </div>

            {/* Lifecycle Stepper */}
            <div className="mt-2">
              <p className="text-sm text-gray-300 mb-2">Lifecycle</p>
              <div className="flex items-center gap-2">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const active = idx === lifecycleIndex
                  const completed = idx < lifecycleIndex
                  return (
                    <div key={step} className="flex items-center flex-1 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          completed
                            ? "bg-orange-500 text-black"
                            : active
                            ? "bg-orange-500/80 text-black"
                            : "bg-gray-600 text-white"
                        }`}
                        title={step}
                      >
                        {idx + 1}
                      </div>
                      <div className="ml-2 min-w-0">
                        <div className={`text-xs truncate ${active ? "text-orange-400" : "text-gray-300"}`}>
                          {step}
                        </div>
                      </div>
                      {idx < LIFECYCLE_STEPS.length - 1 && (
                        <div className={`h-[2px] flex-1 mx-2 ${completed ? "bg-orange-500" : "bg-gray-700"}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "contract" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Contract Upload</h2>
          <input type="file" className="mb-4" />
          <div className="bg-[#0f3460] p-4 rounded text-gray-400">
            AI Extraction Placeholder
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Documents</h2>
            <label className="inline-flex items-center gap-3">
              <span className="text-sm text-gray-300">{uploading ? "Uploading..." : "Upload"}</span>
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="text-sm"
              />
            </label>
          </div>

          {docLoading ? (
            <p className="mt-4 text-gray-300">Loading documents...</p>
          ) : (
            <div className="mt-4">
              {documents.length === 0 ? (
                <div className="bg-[#0f3460] p-4 rounded text-gray-400">
                  No documents yet. Upload one above.
                </div>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li
                      key={doc.name}
                      className="flex items-center justify-between bg-[#0f3460] p-3 rounded"
                    >
                      <div className="min-w-0">
                        <div className="truncate">{doc.name}</div>
                        <div className="text-xs text-gray-400">
                          {(doc.metadata?.size ? `${Math.round(doc.metadata.size / 1024)} KB` : "")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewDocument(doc.name)}
                          className="text-orange-400 hover:underline text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.name)}
                          className="text-red-400 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <ul className="space-y-2 text-gray-300">
            <li>Binding Date: {editData.binding || "—"}</li>
            <li>Closing Date: {editData.closing || "—"}</li>
          </ul>
        </div>
      )}

      {activeTab === "assistant" && (
        <div className="bg-[#16213e] p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">EVA Assistant</h2>
          <div className="bg-[#0f3460] p-4 rounded">
            Transaction-scoped AI chat coming here.
          </div>
        </div>
      )}
    </div>
  )
}
```
