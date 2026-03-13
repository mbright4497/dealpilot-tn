import { NextResponse } from 'next/server'
import { getSupabase } from '../../helpers'
import { mergeWizardRow } from '@/lib/rookwizard'

export async function GET(req: Request, { params }: { params: { transaction_id: string } }){
  try{
    const transactionId = params.transaction_id
    const supabase = await getSupabase()
    const { data, error } = await supabase.from('rookwizard_transactions').select('*').eq('transaction_id', transactionId).maybeSingle()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    const row = data || {}
    const merged = mergeWizardRow(row)
    const address = merged.section_1?.property_address || ''
    const buyers = Array.isArray(merged.section_1?.buyer_names) ? merged.section_1.buyer_names.join(', ') : merged.section_1?.buyer_names || ''
    const sellers = Array.isArray(merged.section_1?.seller_names) ? merged.section_1.seller_names.join(', ') : merged.section_1?.seller_names || ''
    const binding = merged.section_1?.binding_date || row.binding_date || ''
    const inspection = merged.section_3_6?.inspection_end_date || row.inspection_end_date || ''
    const earnest = merged.section_2?.earnest_money || row.earnest_money || ''
    const financing = merged.section_2?.financing || row.financing || ''
    const missing = [] as string[]
    // basic missing fields check
    if(!address) missing.push('Property Address')
    if(!buyers) missing.push('Buyer Name')
    if(!binding) missing.push('Binding Agreement Date')

    const inspectionDays = inspection ? Math.round((new Date(inspection).getTime() - new Date(binding).getTime())/(1000*60*60*24)) : null
    const inspectionStatus = inspectionDays!==null ? (inspectionDays>=10 ? 'TN Standard Met' : 'WARNING: Below TN standard') : 'Inspection date missing'

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TN Compliance Summary - Deal ${transactionId}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111;background:#fff}h1{color:#111} .ok{color:green}.warn{color:orange}</style></head><body>
<h1>TN Compliance Summary</h1>
<p><strong>Property:</strong> ${address}</p>
<p><strong>Buyer(s):</strong> ${buyers}</p>
<p><strong>Seller(s):</strong> ${sellers}</p>
<p><strong>Binding Agreement Date:</strong> ${binding}</p>
<p><strong>Inspection Deadline:</strong> ${inspection} — <span class="${inspectionDays!==null && inspectionDays<10 ? 'warn':'ok'}">${inspectionStatus}</span></p>
<p><strong>Earnest Money:</strong> ${earnest || '—'}</p>
<p><strong>Financing contingency:</strong> ${financing ? 'Present' : 'Missing or not found'}</p>
<h3>Missing Fields</h3>
${missing.length? `<ul>${missing.map(m=>`<li>${m}</li>`).join('')}</ul>` : '<p>None</p>'}
<p>Generated: ${new Date().toLocaleString()}</p>
</body></html>`

    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="tn-compliance-${transactionId}.html"` } })
  }catch(e:any){ console.error('export error', e); return NextResponse.json({ error: e?.message||'failed' }, { status: 500 }) }
}
