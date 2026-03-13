export type DealHealth = { score: number, color: 'green'|'yellow'|'red', reasons: string[] }

// transaction is expected to optionally include:
// - deadlines: Array<{ due_date: string (ISO), status?: 'pending'|'done' }>
// - required_docs_missing: number
// - checklist_incomplete: number
export function computeDealHealth(transaction: any): DealHealth {
  let score = 100
  const reasons: string[] = []
  const now = Date.now()

  const deadlines = Array.isArray(transaction.deadlines) ? transaction.deadlines : (transaction.deadline_list || [])
  for(const d of deadlines){
    try{
      const dueRaw = d.due_date || d.date || d.due || d.dueDate
      if(!dueRaw) continue
      const due = new Date(dueRaw).getTime()
      if(isNaN(due)) continue
      const deltaMs = due - now
      const deltaDays = Math.ceil(deltaMs/(1000*60*60*24))
      if(d.status === 'pending' && deltaMs < 0){ score -= 25; reasons.push(`Overdue deadline: ${String(d.label||d.name||d.type||d.due_date||'deadline')}`) }
      else if(deltaMs < 0){ score -= 25; reasons.push(`Overdue deadline: ${String(d.label||d.name||d.type||d.due_date||'deadline')}`) }
      else if(deltaMs <= (24*60*60*1000)){ score -= 15; reasons.push(`Deadline <24h: ${String(d.label||d.name||d.type||d.due_date||'deadline')}`) }
      else if(deltaMs <= (7*24*60*60*1000)){ score -= 5; reasons.push(`Deadline <7d: ${String(d.label||d.name||d.type||d.due_date||'deadline')}`) }
    }catch(e){ continue }
  }

  const missingDocs = typeof transaction.required_docs_missing === 'number' ? transaction.required_docs_missing : (transaction.missing_required_docs || 0)
  if(missingDocs > 0){ score -= 10 * missingDocs; reasons.push(`${missingDocs} missing required doc(s)`) }

  const checklistIncomplete = typeof transaction.checklist_incomplete === 'number' ? transaction.checklist_incomplete : (transaction.incomplete_checklist_items || 0)
  if(checklistIncomplete > 0){ score -= 3 * checklistIncomplete; reasons.push(`${checklistIncomplete} incomplete checklist item(s)`) }

  // clamp
  if(score < 0) score = 0
  if(score > 100) score = 100

  let color: DealHealth['color'] = 'green'
  if(score >= 75) color = 'green'
  else if(score >= 50) color = 'yellow'
  else color = 'red'

  return { score, color, reasons }
}
