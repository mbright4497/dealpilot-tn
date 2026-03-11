import type { AssistantStyle } from './assistant-personality'

export function applyTone(style: AssistantStyle, message: string): string {
  switch(style){
    case 'joyful':
      return `🎉 ${message} Keep it up!`
    case 'straight':
      return message.replace(/\b(um|uh|like|you know)\b/gi,'').trim()
    case 'calm':
      return `In a calm tone: ${message}`
    case 'executive':
      return `Recommendation: ${message} — consider prioritizing based on ROI and risk.`
    case 'friendly-tn':
    default:
      return `Hey y'all — ${message}`
  }
}

export function getGreeting(style: AssistantStyle, userName: string): string {
  // Use Eastern time for greetings
  const easternNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = easternNow.getHours()
  // Define time ranges per spec
  const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : "It's getting late but let's catch up"
  switch(style){
    case 'joyful': return `${tod}, ${userName}! Let's make today great!` 
    case 'straight': return `${tod}, ${userName}. Here are your items.`
    case 'calm': return `${tod}, ${userName}. A calm update is ready.`
    case 'executive': return `${tod}, ${userName}. Strategic briefing:`
    case 'friendly-tn': default: return `${tod}, ${userName}! I've got your list.`
  }
}

export function getEmptyStateMessage(style: AssistantStyle): string{
  switch(style){
    case 'joyful': return "All clear — nothing urgent. Enjoy your day!"
    case 'straight': return "No urgent items."
    case 'calm': return "You're all caught up — a calm day ahead."
    case 'executive': return "No immediate risks detected. Maintain course."
    case 'friendly-tn': default: return "Nothin' urgent — you're lookin' good today!"
  }
}
