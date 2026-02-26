export type AssistantStyle = 'joyful' | 'straight' | 'calm' | 'executive' | 'friendly-tn'

export const PERSONALITY_OPTIONS: { value: AssistantStyle; label: string; description: string; exampleGreeting: string }[] = [
  { value: 'joyful', label: 'Joyful', description: 'Upbeat, energetic, and encouraging.', exampleGreeting: 'Hey there! Great to see you — ready to crush today?' },
  { value: 'straight', label: 'Straight', description: 'Concise, no-frills, direct to the point.', exampleGreeting: 'Good morning. Here is what needs attention.' },
  { value: 'calm', label: 'Calm', description: 'Measured, reassuring, and professional.', exampleGreeting: 'Good morning. I have a clear update for you.' },
  { value: 'executive', label: 'Executive', description: 'Strategic, advisory tone for high-level decisions.', exampleGreeting: 'Morning. Strategic priorities and impact below.' },
  { value: 'friendly-tn', label: 'Friendly (TN)', description: 'Warm, conversational Tennessee-style friendly assistant.', exampleGreeting: 'Mornin’! I’ve got your list ready — let’s handle it.' },
]

export function getDefaultStyle(): AssistantStyle { return 'friendly-tn' }
