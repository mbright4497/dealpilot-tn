export type LifecycleState = 'draft' | 'binding' | 'inspection_period' | 'post_inspection' | 'closed'

export function computeLifecycleState(row: { binding_date: string | null; inspection_end_date: string | null; closing_date: string | null; }): LifecycleState {
  if (!row.binding_date) return 'draft'
  const today = new Date().toISOString().split('T')[0]
  if (row.inspection_end_date && today <= row.inspection_end_date) return 'inspection_period'
  if (row.inspection_end_date && row.closing_date && today > row.inspection_end_date && today < row.closing_date) return 'post_inspection'
  if (row.closing_date && today >= row.closing_date) return 'closed'
  return 'binding'
}

export function validateLifecycleIntegrity(row: { binding_date: string | null; inspection_end_date: string | null; closing_date: string | null; }) {
  const errors: string[] = []
  if (row.binding_date && !row.inspection_end_date) {
    errors.push('Missing inspection_end_date')
  }
  if (row.inspection_end_date && !row.binding_date) {
    errors.push('Inspection date without binding')
  }
  if (row.closing_date && !row.binding_date) {
    errors.push('Closing date without binding')
  }
  if (row.inspection_end_date && row.closing_date && row.inspection_end_date > row.closing_date) {
    errors.push('Inspection ends after closing')
  }
  if (row.closing_date && row.binding_date && row.closing_date < row.binding_date) {
    errors.push('Closing before binding')
  }
  return { valid: errors.length === 0, errors }
}
