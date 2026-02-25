import { addDays } from './business-days'

export function calculateTNDeadlines(bindingDateStr: string){
  const binding = new Date(bindingDateStr)
  const deadlines: any[] = []

  // Inspection period: 10 business days from binding
  const inspectionEnd = addDays(binding, 10)
  deadlines.push({ key: 'inspection_end', title: 'Inspection Period Ends', due_date: inspectionEnd.toISOString(), days: null })

  // Resolution period: 3 business days after inspection
  const resolutionEnd = addDays(inspectionEnd, 3)
  deadlines.push({ key: 'resolution_end', title: 'Resolution Period Ends', due_date: resolutionEnd.toISOString(), days: null })

  // Earnest money deposit: typically within 3 business days of binding
  const earnestDue = addDays(binding, 3)
  deadlines.push({ key: 'earnest_money_due', title: 'Earnest Money Due', due_date: earnestDue.toISOString() })

  // Appraisal: order within 7 business days
  const appraisalOrderBy = addDays(binding, 7)
  deadlines.push({ key: 'appraisal_order_by', title: 'Appraisal Order By', due_date: appraisalOrderBy.toISOString() })

  // Title commitment: typically requested within 10 business days
  const titleCommitmentBy = addDays(binding, 10)
  deadlines.push({ key: 'title_commitment_by', title: 'Title Commitment By', due_date: titleCommitmentBy.toISOString() })

  // Survey: order within 10 business days
  const surveyOrderBy = addDays(binding, 10)
  deadlines.push({ key: 'survey_order_by', title: 'Survey Order By', due_date: surveyOrderBy.toISOString() })

  // Closing date: often 30 business days default (configurable)
  const closingDate = addDays(binding, 30)
  deadlines.push({ key: 'closing_date', title: 'Closing Date', due_date: closingDate.toISOString() })

  // Final walkthrough: 3 business days before closing
  const finalWalkthrough = addDays(closingDate, -3)
  deadlines.push({ key: 'final_walkthrough', title: 'Final Walkthrough', due_date: finalWalkthrough.toISOString() })

  return deadlines
}
