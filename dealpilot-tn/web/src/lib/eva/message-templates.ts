export const TEMPLATES: Record<string,string> = {
  deadline_reminder: `Reminder: {{client_name}}, this is a friendly reminder that {{deadline_name}} for {{address}} is coming up on {{deadline_date}}. Please let us know if you need assistance.\n\nThanks,\n{{agent_name}} — {{brokerage}}`,
  document_request: `Hi {{client_name}}, we still need {{document_name}} for {{address}} to keep things on track. Please upload when you can or reply to this message to coordinate.\n\nThanks,\n{{agent_name}} — {{brokerage}}`,
  status_update: `Quick update on {{address}}: current status is {{status}}. Next milestone: {{next_milestone}}. I\'ll keep you posted.\n\nBest,\n{{agent_name}} — {{brokerage}}`,
  inspection_notice: `Hi {{client_name}}, the inspection for {{address}} is scheduled on {{inspection_date}}. Please confirm availability or let us know questions.\n\nRegards,\n{{agent_name}} — {{brokerage}}`,
  closing_update: `Congratulations — closing for {{address}} is set for {{closing_date}}. Please review closing docs and reach out with any questions.\n\nSincerely,\n{{agent_name}} — {{brokerage}}`,
  custom: `{{custom}}`
}
