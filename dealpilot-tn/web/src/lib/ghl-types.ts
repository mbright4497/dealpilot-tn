export type GHLContact = {
  id: string
  locationId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  dateAdded?: string
  customFields?: Record<string, any>
}

export type GHLMessage = {
  id: string
  type: string
  contactId?: string
  locationId?: string
  body?: string
  subject?: string
  direction?: string
  status?: string
  dateAdded?: string
}

export type GHLConversation = {
  id: string
  contactId?: string
  locationId?: string
  lastMessageBody?: string
  lastMessageDate?: string
  type?: string
}

export type GHLSendMessagePayload = {
  type: string
  contactId?: string
  message?: string
  subject?: string
  html?: string
}

export type GHLCreateContactPayload = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  locationId: string
  tags?: string[]
}
