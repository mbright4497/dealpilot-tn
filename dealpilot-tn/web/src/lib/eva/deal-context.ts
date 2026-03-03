import { createClient } from '@/lib/supabase'

export async function getDealContext(dealId: string) {
  const sb = createClient()

  // fetch transaction
  const { data: tx, error: txErr } = await sb.from('transactions').select('*').eq('id', dealId).single()

  // fetch checklist items
  const { data: checklist } = await sb.from('checklist_items').select('id,title,status,priority,due_at,completed_at').eq('transaction_id', dealId)

  // fetch documents from storage
  let documents: any[] = []
  try{
    const { data } = await sb.storage.from('deal-documents').list(dealId)
    documents = data || []
  }catch(e){ documents = [] }

  // aggregate milestones (use binding/closing + standard ones)
  const binding = tx?.binding ? new Date(tx.binding) : null
  const closing = tx?.closing ? new Date(tx.closing) : null
  const milestones: any[] = []
  if(binding){
    milestones.push({ key:'binding', label:'Binding Date', date: binding.toISOString() })
    const inspection = new Date(binding); inspection.setDate(inspection.getDate()+10)
    milestones.push({ key:'inspection', label:'Inspection Period End', date: inspection.toISOString() })
    const titleSearch = new Date(binding); titleSearch.setDate(titleSearch.getDate()+14)
    milestones.push({ key:'title_search', label:'Title Search Due', date: titleSearch.toISOString() })
    const appraisal = new Date(binding); appraisal.setDate(appraisal.getDate()+21)
    milestones.push({ key:'appraisal', label:'Appraisal Due', date: appraisal.toISOString() })
  }
  if(closing){
    milestones.push({ key:'closing', label:'Closing Date', date: closing.toISOString() })
    const finalWalk = new Date(closing); finalWalk.setDate(finalWalk.getDate()-1)
    milestones.push({ key:'final_walk', label:'Final Walkthrough', date: finalWalk.toISOString() })
  }

  // determine missing documents (naive: required list)
  const requiredDocs = ['contract','addendum','inspection','appraisal','title']
  const docNames = documents.map(d=> (d.name||'').toLowerCase())
  const missingDocs = requiredDocs.filter(r=> !docNames.some(n=> n.includes(r)))

  // determine overdue tasks
  const now = Date.now()
  const overdueTasks = (checklist||[]).filter((c:any)=> c.due_at && new Date(c.due_at).getTime() < now && c.status !== 'done')

  const context = {
    transaction: tx || null,
    checklist: checklist || [],
    documents: documents || [],
    milestones,
    missingDocs,
    overdueTasks,
  }

  return context
}
