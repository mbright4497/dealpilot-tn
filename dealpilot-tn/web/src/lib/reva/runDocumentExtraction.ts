import type { SupabaseClient } from '@supabase/supabase-js'
import {
  extractPdfTextFromBase64,
  parseContractPdfFromBase64,
  type ParsedContractPayload,
} from '@/app/api/contract-parse/route'
import { extractionInstructionForType } from '@/lib/reva/documentExtractionPrompts'
import { computeDealImpact } from '@/lib/reva/dealImpact'
import { brokerReview } from '@/lib/reva/brokerReview'
import { applyDealImpactToTransaction } from '@/lib/reva/applyDealImpactToTransaction'
import { cleanJsonFromText } from '@/lib/reva/jsonUtils'
import { computeAddressMismatch } from '@/lib/reva/addressMismatch'
import type { TransactionDocumentType } from '@/lib/documents/transactionDocumentTypes'
import { isTransactionDocumentType } from '@/lib/documents/transactionDocumentTypes'

const BUCKET = 'transactions'

async function extractJsonWithGpt(
  instruction: string,
  numberedText: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  const truncated = numberedText.slice(0, 120000)
  const userPrompt = [
    instruction,
    '',
    'Document text (line-numbered):',
    '---',
    truncated,
    '---',
  ].join('\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract structured JSON from Tennessee real estate documents. Return only valid JSON.',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI extraction failed: ${err}`)
  }
  const completion = await res.json()
  const raw = completion?.choices?.[0]?.message?.content
  if (!raw || typeof raw !== 'string') throw new Error('OpenAI returned empty extraction')
  return JSON.parse(cleanJsonFromText(raw)) as Record<string, unknown>
}

export async function runDocumentExtraction(
  supabase: SupabaseClient,
  documentId: number
): Promise<void> {
  const { data: doc, error: docErr } = await supabase
    .from('transaction_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr || !doc) {
    console.error('[runDocumentExtraction] document not found', documentId, docErr)
    return
  }

  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('id, user_id, address')
    .eq('id', doc.transaction_id)
    .maybeSingle()

  if (txErr || !tx || tx.user_id !== doc.user_id) {
    console.error('[runDocumentExtraction] transaction ownership mismatch', documentId)
    await supabase
      .from('transaction_documents')
      .update({
        status: 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
    return
  }

  await supabase
    .from('transaction_documents')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', documentId)

  const path = doc.file_url as string | null
  if (!path) {
    await supabase
      .from('transaction_documents')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', documentId)
    return
  }

  try {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
    if (dlErr || !blob) throw new Error(dlErr?.message || 'download failed')

    const buf = Buffer.from(await blob.arrayBuffer())
    const base64 = buf.toString('base64')

    const docType = String(doc.document_type || 'other')
    const typed = isTransactionDocumentType(docType) ? docType : 'other'

    let extracted: unknown

    if (docType === 'rf401_psa') {
      const parsed: ParsedContractPayload = await parseContractPdfFromBase64(base64)
      extracted = parsed
    } else {
      const text = await extractPdfTextFromBase64(base64)
      const lines = text.split('\n')
      const numberedText = lines.map((line: string, i: number) => `L${i + 1}: ${line}`).join('\n')
      const instruction = extractionInstructionForType(docType)
      extracted = await extractJsonWithGpt(instruction, numberedText)
    }

    let dealImpact = computeDealImpact(typed as TransactionDocumentType, extracted)
    const addrMismatch = computeAddressMismatch(extracted, tx?.address ?? null)
    if (addrMismatch) {
      dealImpact = { ...dealImpact, address_mismatch: addrMismatch }
    }

    const review = await brokerReview({
      documentType: docType,
      displayName: String(doc.display_name || ''),
      extractedData: extracted,
    })

    await applyDealImpactToTransaction(supabase, doc.transaction_id, docType, dealImpact, extracted)

    await supabase
      .from('transaction_documents')
      .update({
        status: 'reviewed',
        extracted_data: extracted as object,
        broker_review: review as object,
        deal_impact: dealImpact as object,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
  } catch (e: any) {
    console.error('[runDocumentExtraction]', documentId, e)
    await supabase
      .from('transaction_documents')
      .update({
        status: 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
  }
}
