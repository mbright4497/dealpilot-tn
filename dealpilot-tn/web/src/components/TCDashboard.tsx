/**
 * Shared types for the Reva dashboard. Main dashboard UI is composed in
 * `app/chat/page.tsx` (avatar, weather, briefing, Ask Reva, RookWizard, deal ticker, actions).
 */
export type RevaDealHealth = {
  id: number
  address: string | null
  client: string | null
  status: string | null
  daysToClose: number | null
  isOverdue: boolean
  hasBinding: boolean
}
