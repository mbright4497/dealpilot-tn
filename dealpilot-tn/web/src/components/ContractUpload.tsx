'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ExtractedData {
  buyer_name?: string;
  seller_name?: string;
  property_address?: string;
  purchase_price?: number;
  earnest_money?: number;
  closing_date?: string;
  binding_date?: string;
  loan_type?: string;
  loan_amount?: number;
  inspection_period_days?: number;
  financing_contingency_days?: number;
  possession_date?: string;
  agent_name?: string;
  brokerage?: string;
  notes?: string;
}

interface ContractUploadProps {
  dealId: string;
  onExtracted?: (data: ExtractedData) => void;
}

export default function ContractUpload({ dealId, onExtracted }: ContractUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setError(null);
    setExtractedData(null);
    setSaved(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealId', dealId);

      const res = await fetch('/api/ai/extract-contract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Extraction failed');
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      if (onExtracted) onExtracted(data.extracted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract contract data');
    } finally {
      setUploading(false);
    }
  }, [dealId, onExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleSaveToDoc = async () => {
    if (!extractedData) return;
    try {
      const res = await fetch(`/api/deals/${dealId}/apply-contract`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData),
      });
      if (res.ok) setSaved(true);
    } catch {
      // ignore
    }
  };

  const formatCurrency = (val?: number) =>
    val ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : '—';

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Extracting contract data with AI...</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragActive ? 'Drop the contract here...' : 'Drag & drop your contract, or click to browse'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Supports PDF, DOC, DOCX, TXT</p>
              {fileName && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                  Last uploaded: {fileName}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Extracted Contract Data</h3>
              <p className="text-xs text-gray-500 mt-0.5">Review and save to deal</p>
            </div>
            <button
              onClick={handleSaveToDoc}
              disabled={saved}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saved ? '✓ Saved to Deal' : 'Save to Deal'}
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[
              { label: 'Buyer', value: extractedData.buyer_name },
              { label: 'Seller', value: extractedData.seller_name },
              { label: 'Property Address', value: extractedData.property_address },
              { label: 'Purchase Price', value: formatCurrency(extractedData.purchase_price) },
              { label: 'Earnest Money', value: formatCurrency(extractedData.earnest_money) },
              { label: 'Loan Amount', value: formatCurrency(extractedData.loan_amount) },
              { label: 'Loan Type', value: extractedData.loan_type },
              { label: 'Binding Date', value: extractedData.binding_date },
              { label: 'Closing Date', value: extractedData.closing_date },
              { label: 'Possession Date', value: extractedData.possession_date },
              { label: 'Inspection Period', value: extractedData.inspection_period_days ? `${extractedData.inspection_period_days} days` : undefined },
              { label: 'Financing Contingency', value: extractedData.financing_contingency_days ? `${extractedData.financing_contingency_days} days` : undefined },
              { label: 'Agent', value: extractedData.agent_name },
              { label: 'Brokerage', value: extractedData.brokerage },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}

            {extractedData.notes && (
              <div className="px-5 py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Notes</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{extractedData.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
