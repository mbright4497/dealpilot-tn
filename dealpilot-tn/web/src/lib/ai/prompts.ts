type Deal = {
  id: string;
  address: string;
  client: string | null;
  status: string | null;
  binding: string | null;
  closing: string | null;
  inspection_end_date: string | null;
};

function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;

  const now = new Date();
  const target = new Date(dateString);

  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function buildDailyBriefingPrompt(deals: Deal[]): string {
  if (!deals.length) {
    return `
You have no active transactions today.
Return:
{
  "summary": "No active transactions.",
  "priorities": [],
  "riskLevel": "healthy"
}
`;
  }

  const dealSummaries = deals.map((deal) => {
    const closingDays = daysUntil(deal.closing);
    const inspectionDays = daysUntil(deal.inspection_end_date);

    return {
      address: deal.address,
      client: deal.client,
      status: deal.status,
      closing_in_days: closingDays,
      inspection_ends_in_days: inspectionDays,
    };
  });

  return `
You are preparing a structured daily transaction briefing for a Tennessee real estate agent.
Here are the active transactions:
${JSON.stringify(dealSummaries, null, 2)}
Instructions:
- Summarize overall portfolio health in 2-4 sentences.
- Identify 3-5 priority actions if needed.
- Determine overall risk level:
  - "healthy" (everything on track)
  - "attention" (some deadlines approaching)
  - "at_risk" (past due or critical issues)
Return ONLY valid JSON in this format:
{
  "summary": "string",
  "priorities": ["string"],
  "riskLevel": "healthy" | "attention" | "at_risk"
}
`;
}
