export type GHLContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
};

const GHL_BASE_V1 = "https://rest.gohighlevel.com/v1";
const GHL_BASE_V2 = "https://services.leadconnectorhq.com";

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-07-28",
  };
}

export async function sendGHLEmail(
  apiKey: string,
  to: { email: string; name: string },
  from: { email: string; name: string },
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string }> {
  const res = await fetch(`${GHL_BASE_V1}/emails/`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ to, from, subject, html: body }),
  });
  if (!res.ok) return { success: false };
  const json = await res.json().catch(() => ({}));
  return { success: true, messageId: json?.id || json?.messageId };
}

export async function sendGHLSMS(
  apiKey: string,
  toPhone: string,
  fromPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  const res = await fetch(`${GHL_BASE_V1}/sms/`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ to: toPhone, from: fromPhone, message }),
  });
  if (!res.ok) return { success: false };
  const json = await res.json().catch(() => ({}));
  return { success: true, messageId: json?.id || json?.messageId };
}

export async function getGHLContacts(apiKey: string, query?: string): Promise<GHLContact[]> {
  const url = new URL(`${GHL_BASE_V2}/contacts/`);
  if (query) url.searchParams.set("query", query);
  const res = await fetch(url.toString(), { headers: authHeaders(apiKey) });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  const contacts = Array.isArray(json?.contacts) ? json.contacts : [];
  return contacts.map((c: any) => ({
    id: String(c.id || ""),
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    email: c.email || "",
    phone: c.phone || "",
    tags: Array.isArray(c.tags) ? c.tags : [],
  }));
}

export async function createGHLContact(
  apiKey: string,
  contact: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    tags?: string[];
  }
): Promise<{ id: string }> {
  const res = await fetch(`${GHL_BASE_V2}/contacts/`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error("Failed to create GHL contact");
  const json = await res.json().catch(() => ({}));
  return { id: String(json?.contact?.id || json?.id || "") };
}

export async function testGHLConnection(
  apiKey: string
): Promise<{ connected: boolean; accountName?: string }> {
  const res = await fetch(`${GHL_BASE_V2}/locations/`, {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) return { connected: false };
  const json = await res.json().catch(() => ({}));
  const first = Array.isArray(json?.locations) ? json.locations[0] : null;
  return { connected: true, accountName: first?.name || "GHL Account" };
}
