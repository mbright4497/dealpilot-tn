'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
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
  onDelete?: () => void;
}

type FieldSection = { title: string; fields: { label: string; value: string | undefined }[] };

export default function ContractUpload({ dealId, onExtracted, onSave, onDelete }: ContractUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const onExtractedRef = useRef(onExtracted);
  onExtractedRef.current = onExtracted;
  const blobUrlRef = useRef<string | null>(null);

  const fmt = (val?: number) =>
    val != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
      : undefined;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // Load existing contract on mount
  useEffect(() => {
    let mounted = true;
    setExtractedData(null);
    setPdfUrl(null);
    setSaved(false);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}/contract`);
        if (!res.ok) return;
        const j = await res.json();
        if (mounted) {
          if (j?.extracted) {
            setExtractedData(j.extracted);
            if (onExtractedRef.current) onExtractedRef.current(j.extracted);
          }
          if (j?.pdfUrl) setPdfUrl(j.pdfUrl);
        }
      } catch (_e) {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dealId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setExtractedData(null);
    setSaved(false);
    // Revoke old blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    const newBlobUrl = URL.createObjectURL(file);
    blobUrlRef.current = newBlobUrl;
    setPdfUrl(newBlobUrl);

    let uploadedUrl: string | null = null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealId', dealId);
      const res = await fetch('/api/ai/extract-contract', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Extraction failed');
      }
      const data = await res.json();
      setExtractedData(data.extracted);
      if (onExtractedRef.current) onExtractedRef.current(data.extracted);

      // Upload PDF to Supabase Storage
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const uploadRes = await fetch(`/api/deals/${dealId}/contract-upload`, { method: 'POST', body: uploadForm });
        if (uploadRes.ok) {
          const ud = await uploadRes.json();
          if (ud?.url) {
            uploadedUrl = ud.url;
            setPdfUrl(ud.url);
            // Revoke blob since we have the real URL now
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
              blobUrlRef.current = null;
            }
          }
        }
      } catch (_e) { /* ignore upload errors */ }

      // Auto-save extracted data with the uploaded URL
      try {
        await fetch(`/api/deals/${dealId}/contract`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extracted: data.extracted, pdfUrl: uploadedUrl }),
        });
        setSaved(true);
      } catch (_e) { /* ignore */ }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract contract data');
    } finally {
      setUploading(false);
    }
  }, [dealId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleSave = async () => {
    if (!extractedData) return;
    try {
      const res = await fetch(`/api/deals/${dealId}/contract`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted: extractedData, pdfUrl: pdfUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('API save failed:', err);
      }
    } catch (e) {
      console.warn('Save to Supabase failed, falling back to localStorage', e);
    }
    try {
      localStorage.setItem(`dp-contract-${dealId}`, JSON.stringify(extractedData));
    } catch (_e) { /* ignore */ }
    if (onSave) onSave(extractedData);
    setSaved(true);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await fetch(`/api/deals/${dealId}/contract`, { method: 'DELETE' });
      // Clear localStorage
      try { localStorage.removeItem(`dp-contract-${dealId}`); } catch (_e) {}
      // Revoke blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setExtractedData(null);
      setPdfUrl(null);
      setSaved(false);
      setError(null);
      if (onDelete) onDelete();
    } catch (e) {
      console.error('Delete failed:', e);
      setError('Failed to delete contract');
    } finally {
      setDeleting(false);
    }
  };

  const getSections = (d: ExtractedData): FieldSection[] => [
    { title: 'Parties', fields: [{ label: 'Buyer(s)', value: d.buyer_names?.join(', ') }, { label: 'Seller(s)', value: d.seller_names?.join(', ') }] },
    { title: 'Property', fields: [{ label: 'Address', value: d.property_address }, { label: 'County', value: d.county }, { label: 'Type', value: d.property_type }] },
    { title: 'Financial', fields: [{ label: 'Purchase Price', value: fmt(d.sale_price) }, { label: 'Earnest Money', value: fmt(d.earnest_money) }, { label: 'Loan Type', value: d.loan_type }, { label: 'Loan Amount', value: fmt(d.loan_amount) }] },
    { title: 'Key Dates', fields: [{ label: 'Binding Agreement', value: d.binding_agreement_date }, { label: 'Closing Date', value: d.closing_date }, { label: 'Possession', value: d.possession_date }, { label: 'Inspection Period', value: d.inspection_period_days != null ? `${d.inspection_period_days} days` : undefined }, { label: 'Resolution Period', value: d.resolution_period_days != null ? `${d.resolution_period_days} days` : undefined }, { label: 'Financing Contingency', value: d.financing_contingency_days != null ? `${d.financing_contingency_days} days` : undefined }] },
    { title: 'Contingencies', fields: [{ label: 'Appraisal Contingent', value: d.appraisal_contingent != null ? (d.appraisal_contingent ? 'Yes' : 'No') : undefined }, { label: 'Lead-Based Paint', value: d.lead_based_paint != null ? (d.lead_based_paint ? 'Applies' : 'N/A') : undefined }, { label: 'Home Warranty', value: d.home_warranty != null ? (d.home_warranty ? 'Yes' : 'No') : undefined }] },
    { title: 'Agents & Closing', fields: [{ label: 'Listing Agent', value: d.listing_agent }, { label: 'Listing Brokerage', value: d.listing_brokerage }, { label: 'Buyer Agent', value: d.buyer_agent }, { label: 'Buyer Brokerage', value: d.buyer_brokerage }, { label: 'Title Company', value: d.title_company }] },
  ];

  // Empty state: show dropzone
  if (!pdfUrl && !extractedData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl" {...getRootProps()}>
        <input {...getInputProps()} className="hidden" />
        {uploading ? (
          <p className="text-orange-500 animate-pulse">Extracting contract data with AI...</p>
        ) : (
          <>
            <p className="text-gray-500 text-center">{isDragActive ? 'Drop the contract here...' : 'Drag & drop your contract, or click to browse'}</p>
            <p className="text-xs text-gray-400 mt-2">Supports PDF and TXT files</p>
          </>
        )}
        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Extracted Contract Data</h3>
          <div className="flex gap-2">
            <button onClick={() => { if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; } setPdfUrl(null); setExtractedData(null); setError(null); setSaved(false); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Upload New</button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-1.5 rounded-lg border border-red-400 text-red-400 hover:bg-red-900/20 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Contract'}</button>
            <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600">{saved ? '\u2713 Saved' : 'Save to Deal'}</button>
          </div>
        </div>
        {uploading && (
          <p className="text-orange-500 animate-pulse mb-4">Extracting contract data with AI...</p>
        )}
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        {extractedData && getSections(extractedData).map((section) => (
          <div key={section.title} className="mb-4 border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-orange-500 mb-2">{section.title}</h4>
            <div className="grid grid-cols-2 gap-2">
              {section.fields.map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-500">{f.label}</p>
                  <p className="text-sm">{f.value || '\u2014'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {pdfUrl && (
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">Contract PDF</p>
          <iframe src={pdfUrl} className="w-full h-[700px] border rounded-lg" title="Contract PDF" />
        </div>
      )}
    </div>
  );
}
