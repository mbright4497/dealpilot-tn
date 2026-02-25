import { addDays } from './business-days'

export function generateDeadlines(bindingAgreementDate: string, loanType: string){
  const start = new Date(bindingAgreementDate)
  const deadlines:any[] = []
  // inspection +10 business days
  const inspectionDate = addDays(start, 10)
  deadlines.push({name:'Inspection Period End', due_date: inspectionDate.toISOString().slice(0,10), category:'inspection'})
  // appraisal +21 calendar
  const appraisal = new Date(start); appraisal.setDate(appraisal.getDate()+21)
  deadlines.push({name:'Appraisal Due', due_date: appraisal.toISOString().slice(0,10), category:'appraisal'})
  // financing +30 cal
  const financing = new Date(start); financing.setDate(financing.getDate()+30)
  if(loanType!=='cash') deadlines.push({name:'Financing Contingency End', due_date: financing.toISOString().slice(0,10), category:'financing'})
  // title +14 cal
  const title = new Date(start); title.setDate(title.getDate()+14)
  deadlines.push({name:'Title Review', due_date: title.toISOString().slice(0,10), category:'title'})
  // survey +21 cal
  const survey = new Date(start); survey.setDate(survey.getDate()+21)
  deadlines.push({name:'Survey Review', due_date: survey.toISOString().slice(0,10), category:'survey'})
  return deadlines
}
