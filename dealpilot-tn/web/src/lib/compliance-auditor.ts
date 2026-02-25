export async function runComplianceChecks(deal:any, db:any){
  const issues:string[] = []
  let score = 100
  // RF401 complete
  const rf = deal.document_fields || {}
  const required = ['buyer_names','seller_names','property','sale_price']
  required.forEach(r=>{ if(!rf[r]){ issues.push(`Missing ${r}`); score -=20 } })
  // deadlines
  const deadlines = await db.from('deal_deadlines').select('*').eq('deal_id',deal.id)
  const pending = (deadlines?.data||deadlines).filter((d:any)=>d.status!=='completed')
  if(pending.length>0){ issues.push('Outstanding deadlines'); score -= pending.length*5 }
  // earnest money, title commitment, lender approval, walkthrough, signatures - simplified checks
  if(!deal.earnest_money_received){ issues.push('Earnest money not received'); score-=10 }
  if(!deal.title_commitment_received){ issues.push('Title commitment missing'); score-=10 }
  if(!deal.lender_approval && deal.loan_type!=='cash'){ issues.push('Lender approval missing'); score-=10 }
  return {score: Math.max(0,score), issues}
}
