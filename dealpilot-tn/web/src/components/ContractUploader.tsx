'use client'

import React, { useState, useRef } from 'react'
import { UploadCloud, FileText, Loader2 } from 'lucide-react'

type Props = {
  onParsed: (data: any) => void
}

export default function ContractUploader({ onParsed }: Props) {

  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)

  function readFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }

      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File) {

    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF contract.')
      return
    }

    setFileName(file.name)
    setLoading(true)
    setProgress(10)

    try {

      const base64 = await readFile(file)

      setProgress(40)

      const res = await fetch('/api/contract-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file: base64 })
      })

      setProgress(80)

      const data = await res.json()

      setProgress(100)

      onParsed(data)

    } catch (err) {
      console.error(err)
      alert('Error parsing contract.')
    }

    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="bg-[#0a1929] border border-white/10 rounded-xl p-6">

      {/* Upload Area */}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
          ${dragging ? 'border-orange-500 bg-[#0f223a]' : 'border-white/10'}
        `}
      >

        {!loading && (
          <>
            <UploadCloud size={40} className="mx-auto mb-4 text-gray-400" />

            <p className="text-white font-medium mb-1">
              Drag & drop your contract PDF
            </p>

            <p className="text-gray-400 text-sm">
              or click to upload
            </p>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center">

            <Loader2 className="animate-spin text-orange-500 mb-3" size={36} />

            <p className="text-white font-medium">
              Eva is reading your contract...
            </p>

            <p className="text-gray-400 text-sm mt-1">
              Extracting RF401 data
            </p>

            <div className="w-full bg-white/10 h-2 rounded mt-4 overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>
        )}

        {fileName && !loading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-300">
            <FileText size={16} />
            {fileName}
          </div>
        )}

      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

    </div>
  )
}
