export type TaskStatus = 'todo'|'in_progress'|'done'|'blocked'

export const STANDARD_TC_CHECKLIST = [
  { key:'contract_received', title: 'Contract Received', status: 'todo' },
  { key:'earnest_money_verified', title: 'Earnest Money Verified', status: 'todo' },
  { key:'inspections_scheduled', title: 'Inspections Scheduled', status: 'todo' },
  { key:'inspections_completed', title: 'Inspections Completed', status: 'todo' },
  { key:'appraisal_ordered', title: 'Appraisal Ordered', status: 'todo' },
  { key:'appraisal_received', title: 'Appraisal Received', status: 'todo' },
  { key:'title_search_ordered', title: 'Title Search Ordered', status: 'todo' },
  { key:'title_commitment_received', title: 'Title Commitment Received', status: 'todo' },
  { key:'survey_ordered', title: 'Survey Ordered', status: 'todo' },
  { key:'hoa_docs_requested', title: 'HOA Docs Requested', status: 'todo' },
  { key:'lender_updates', title: 'Lender Updates / Loan Conditions', status: 'todo' },
  { key:'disclosures_sent', title: 'Disclosures Sent', status: 'todo' },
  { key:'final_walkthrough', title: 'Final Walkthrough Scheduled', status: 'todo' },
  { key:'closing_prep', title: 'Closing Preparation', status: 'todo' },
  { key:'closing_confirmed', title: 'Closing Confirmed', status: 'todo' },
]

export function createChecklistInstance(){
  return STANDARD_TC_CHECKLIST.map(t=>({ ...t, updated_at: new Date().toISOString() }))
}

export function updateTask(checklist: any[], key: string, status: TaskStatus){
  const idx = checklist.findIndex(c=>c.key===key)
  if(idx===-1) return checklist
  checklist[idx].status = status
  checklist[idx].updated_at = new Date().toISOString()
  return checklist
}

export function checklistProgress(checklist: any[]){
  const total = checklist.length
  const done = checklist.filter(c=>c.status==='done').length
  return Math.round((done/total)*100)
}
