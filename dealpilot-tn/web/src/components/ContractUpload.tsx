'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface ContractUploadProps {
  dealId: string
  onSave?: (data: { pdfUrl?: string }) => void
  onDelete?: () => void
}

export default function ContractUpload({ dealId, onSave, onDelete }: ContractUploadProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const localStorageKey = `contract_pdf_${dealId}`

  const resetPreview = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPreviewUrl(null)
  }, [])

  useEffect(() => {
    return () => {
      resetPreview()
    }
  }, [resetPreview])

  useEffect(() => {
    let mounted = true

    const loadContract = async () => {
      setError(null)
      setLoading(true)

      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(localStorageKey)
          if (mounted && cached) {
            setPdfUrl(cached)
          }
        }
      } catch (_e) {
        /* ignore */
      }

      try {
        const res = await fetch(`/api/deals/${dealId}/contract`)
        if (!res.ok) {
          return
        }
        const data = await res.json()
        if (!mounted) return
        if (data?.pdfUrl) {
          setPdfUrl(data.pdfUrl)
          setSelectedFile(null)
          resetPreview()
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(localStorageKey, data.pdfUrl)
            }
          } catch (_e) {
            /* ignore */
          }
        } else {
          setPdfUrl(null)
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(localStorageKey)
            }
          } catch (_e) {
            /* ignore */
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load contract')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadContract()

    return () => {
      mounted = false
    }
  }, [dealId, localStorageKey, resetPreview])

  const handleSave = async () => {
    if (!selectedFile) return
    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`/api/deals/${dealId}/contract`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save contract')
      }

      const data = await res.json()
      const savedUrl = data?.url
      if (!savedUrl) {
        throw new Error('Contract save did not return a PDF URL')
      }

      setPdfUrl(savedUrl)
      setSelectedFile(null)
      resetPreview()
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(localStorageKey, savedUrl)
        }
      } catch (_e) {
        /* ignore */
      }

      if (onSave) onSave({ pdfUrl: savedUrl })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save contract')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract? This cannot be undone.')) return
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/deals/${dealId}/contract`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete contract')
      }

      setPdfUrl(null)
      setSelectedFile(null)
      resetPreview()
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(localStorageKey)
        }
      } catch (_e) {
        /* ignore */
      }
      if (onDelete) onDelete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract')
    } finally {
      setDeleting(false)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    resetPreview()
    const blobUrl = URL.createObjectURL(file)
    blobUrlRef.current = blobUrl
    setPreviewUrl(blobUrl)
    setSelectedFile(file)
    setError(null)
  }, [resetPreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: !!pdfUrl || saving || loading,
  })

  const renderDropzone = () => (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl" {...getRootProps()}>
      <input {...getInputProps()} className="hidden" />
      {saving ? (
        <p className="text-orange-500 animate-pulse">Saving contract to Supabase...</p>
      ) : isDragActive ? (
        <p className="text-gray-500 text-center">Drop the contract here...</p>
      ) : (
        <>
          <p className="text-gray-500 text-center">Drag & drop your contract, or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">Supports PDF files</p>
        </>
      )}
      {selectedFile && (
        <p className="text-sm text-gray-600 mt-3">Selected file: {selectedFile.name}</p>
      )}
    </div>
  )

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {loading ? (
          <div className="p-12 border-2 border-dashed rounded-xl text-center text-gray-500">Loading contract...</div>
        ) : pdfUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Contract PDF</p>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting contract...' : 'Delete Contract'}
              </button>
            </div>
            <iframe src={pdfUrl} className="w-full h-[700px] border rounded-lg" title="Contract PDF" />
          </div>
        ) : (
          <>
            {renderDropzone()}
            {previewUrl && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <iframe src={previewUrl} className="w-full h-[400px]" title="Contract preview" />
              </div>
            )}
            {selectedFile && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="bg-orange-500 text-white px-4 py-2 rounded"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving contract...' : 'Save Contract'}
                </button>
                <p className="text-xs text-gray-500">The file will be stored in Supabase storage and cached locally.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
