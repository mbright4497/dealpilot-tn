'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ExtractedData {
  buyer_names?: string[];
  seller_names?: string[];
  property_address?: string;
  county?: string;
  property_type?: string;
  sale_price?: number;
  earnest_money?: number;
  loan_type?: string;
  loan_amount?: number;
  binding_agreement_date?: string;
  closing_date?: string;
  possession_date?: string;
  inspection_period_days?: number;
  resolution_period_days?: number;
  financing_contingency_days?: number;
  appraisal_contingent?: boolean;
  title_company?: string;
  listing_agent?: string;
  listing_brokerage?: string;
  buyer_agent?: string;
  buyer_brokerage?: string;
  home_warranty?: boolean;
  lead_based_paint?: boolean;
  special_stipulations?: string[];
  items_remaining?: string[];
  items_not_remaining?: string[];
}

interface ContractUploadProps {
  dealId: string;
  onExtracted?: (data: ExtractedData) => void;
  onSave?: (data: ExtractedData) => void;
}

type FieldSection = { title: string; fields: { label: string; value: string | undefined }[] };

export default function ContractUpload({ dealId, onExtracted, onSave }: ContractUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fmt = (val?: number) => val != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : undefined;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setExtractedData(null);
    setSaved(false);
    setPdfUrl(URL.createObjectURL(file));
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
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleSave = () => {
    if (!extractedData) return;
    try {
      localStorage.setItem(`dp-contract-${dealId}`, JSON.stringify(extractedData));
      if (onSave) onSave(extractedData);
      setSaved(true);
    } catch { /* ignore */ }
  };

  const getSections = (d: ExtractedData): FieldSection[] => [
    { title: 'Parties', fields: [ { label: 'Buyer(s)', value: d.buyer_names?.join(', ') }, { label: 'Seller(s)', value: d.seller_names?.join(', ') }, ]},
    { title: 'Property', fields: [ { label: 'Address', value: d.property_address }, { label: 'County', value: d.county }, { label: 'Type', value: d.property_type }, ]},
    { title: 'Financial', fields: [ { label: 'Purchase Price', value: fmt(d.sale_price) }, { label: 'Earnest Money', value: fmt(d.earnest_money) }, { label: 'Loan Type', value: d.loan_type }, { label: 'Loan Amount', value: fmt(d.loan_amount) }, ]},
    { title: 'Key Dates', fields: [ { label: 'Binding Agreement', value: d.binding_agreement_date }, { label: 'Closing Date', value: d.closing_date }, { label: 'Possession', value: d.possession_date }, { label: 'Inspection Period', value: d.inspection_period_days != null ? `${d.inspection_period_days} days` : undefined }, { label: 'Resolution Period', value: d.resolution_period_days != null ? `${d.resolution_period_days} days` : undefined }, { label: 'Financing Contingency', value: d.financing_contingency_days != null ? `${d.financing_contingency_days} days` : undefined }, ]},
    { title: 'Contingencies & Disclosures', fields: [ { label: 'Appraisal Contingent', value: d.appraisal_contingent != null ? (d.appraisal_contingent ? 'Yes' : 'No') : undefined }, { label: 'Lead-Based Paint', value: d.lead_based_paint != null ? (d.lead_based_paint ? 'Applies' : 'N/A') : undefined }, { label: 'Home Warranty', value: d.home_warranty != null ? (d.home_warranty ? 'Yes' : 'No') : undefined }, ]},
    { title: 'Agents & Closing', fields: [ { label: 'Listing Agent', value: d.listing_agent }, { label: 'Listing Brokerage', value: d.listing_brokerage }, { label: 'Buyer Agent', value: d.buyer_agent }, { label: 'Buyer Brokerage', value: d.buyer_brokerage }, { label: 'Title Company', value: d.title_company }, ]},
  ];

  if (!pdfUrl) {
    return (
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
          } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-orange-700 dark:text-orange-400">Extracting contract data with AI...</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isDragActive ? 'Drop the contract here...' : 'Drag & drop your contract, or click to browse'}
                </p>
                <p className="text-xs text-gray-500">Supports PDF and TXT files</p>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]">
      {/* Left: Extracted Fields */}
      <div className="w-1/2 overflow-y-auto pr-2 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Extracted Contract Data</h3>
          <div className="flex gap-2">
            <button onClick={() => { setPdfUrl(null); setExtractedData(null); setError(null); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" >
              Upload New
            </button>
            <button onClick={handleSave} disabled={saved || !extractedData} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${ saved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-600 text-white hover:bg-orange-700' }`} >{saved ? '\u2713 Saved' : 'Save to Deal'}</button>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center gap-3 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-orange-700 dark:text-orange-400">Extracting contract data with AI...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        {extractedData && getSections(extractedData).map((section) => (
          <div key={section.title} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{section.title}</h4>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {section.fields.map((field) => (
                <div key={field.label} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{field.label}</span>
                  {field.value ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{field.value}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">Needs Input</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {extractedData?.special_stipulations && extractedData.special_stipulations.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Special Stipulations</h4>
            </div>
            <div className="p-4 space-y-2">
              {extractedData.special_stipulations.map((s, i) => (
                <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{s}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: PDF Viewer */}
      <div className="w-1/2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <iframe src={pdfUrl || ''} className="w-full h-full" title="Contract PDF" />
      </div>
    </div>
  );
}
