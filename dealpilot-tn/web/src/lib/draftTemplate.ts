export type Contact = { role:string, name:string, company?:string, phone?:string, email?:string }
export type Transaction = { id:number, address:string, client:string, type:string, status:string, binding?:string, closing?:string, contacts?:Contact[], notes?:string, timeline?:any[] }

type DraftTemplate = { subject:string, body:string, to:string }

const normalizeRole = (value?: string) => (value || '').trim().toLowerCase()

const roleMatches = (contactRole?: string, targetRole?: string) => {
  if(!contactRole || !targetRole) return false
  const contactValue = normalizeRole(contactRole)
  const targetValue = normalizeRole(targetRole)
  if(!contactValue || !targetValue) return false
  return contactValue === targetValue || contactValue.includes(targetValue)
}

const findFirstContactForRole = (contacts: Contact[], roleLabel: string) => {
  return contacts.find(contact => roleMatches(contact.role, roleLabel))
}

const resolveRoleEmails = (contacts: Contact[], roleLabel: string) => {
  const emails = contacts
    .filter(contact => contact.email && roleMatches(contact.role, roleLabel))
    .map(contact => contact.email!.trim())
    .filter(Boolean)
  return Array.from(new Set(emails))
}

const collectAllPartyEmails = (contacts: Contact[]) => {
  const emails = contacts
    .filter(contact => contact.email)
    .map(contact => contact.email!.trim())
    .filter(Boolean)
  return Array.from(new Set(emails))
}

const formatToField = (emails: string[], label: string) => {
  if(emails.length === 0) return `[Warning: ${label} email not on file]`
  return emails.join(', ')
}

const buildDraftSubject = (kind: string, addr: string) => {
  if(kind === 'lender') return `Request: Loan status update for ${addr}`
  if(kind === 'title') return `Request: Title update for ${addr}`
  if(kind === 'closing') return `Reminder: Closing timeline for ${addr}`
  return ''
}

const buildDraftBody = (kind: string, addr: string, buyer: string, contactName?: string) => {
  if(kind === 'lender'){
    const name = contactName || 'Lender'
    return `Hi ${name},\n\nThis is a status update request for ${addr}. Please confirm the current loan status and any outstanding conditions.\n\nThanks,\n${buyer}`
  }
  if(kind === 'title'){
    const name = contactName || 'Title Team'
    return `Hi ${name},\n\nCould you please provide the current title commitment status for ${addr}? Please include any exceptions or required cures.\n\nThanks,\n${buyer}`
  }
  if(kind === 'closing'){
    return `Hello all,\n\nThis is a reminder that closing for ${addr} is upcoming. Please confirm final readiness and any outstanding items.\n\nThanks,\n${buyer}`
  }
  return ''
}

export function buildDraftTemplate(kind: string, transaction: Transaction, contacts: Contact[]): DraftTemplate {
  const addr = transaction.address || ''
  const buyer = transaction.client || ''
  const template: DraftTemplate = { subject: '', body: '', to: '' }
  if(kind === 'lender'){
    const subject = buildDraftSubject(kind, addr)
    const nameContact = findFirstContactForRole(contacts, 'lender')
    const body = buildDraftBody(kind, addr, buyer, nameContact?.name)
    const emails = resolveRoleEmails(contacts, 'lender')
    const to = formatToField(emails, 'Lender')
    return { subject, body, to }
  }
  if(kind === 'title'){
    const subject = buildDraftSubject(kind, addr)
    const nameContact = findFirstContactForRole(contacts, 'title')
    const body = buildDraftBody(kind, addr, buyer, nameContact?.name)
    const emails = resolveRoleEmails(contacts, 'title')
    const to = formatToField(emails, 'Title')
    return { subject, body, to }
  }
  if(kind === 'closing'){
    const subject = buildDraftSubject(kind, addr)
    const body = buildDraftBody(kind, addr, buyer)
    const emails = collectAllPartyEmails(contacts)
    const to = formatToField(emails, 'All Parties')
    return { subject, body, to }
  }
  return template
}
