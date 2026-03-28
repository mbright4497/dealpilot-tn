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
  to: { email: string; name: string; ghlContactId?: string | null },
  from: { email: string; name: string },
  subject: string,
  body: string,
  locationId?: string | null
): Promise<{ success: boolean; messageId?: string; fromEmail?: string }> {
  const ghlContactId = String(to.ghlContactId || "").trim();
  const loc = String(locationId || "").trim();

  if (ghlContactId) {
    const res = await fetch(`${GHL_BASE_V2}/conversations/messages`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        to: ghlContactId,
        subject,
        body,
        ...(loc ? { location_id: loc } : {}),
        channel: "email",
      }),
    });
    if (!res.ok) return { success: false };
    const json = await res.json().catch(() => ({}));
    return {
      success: true,
      messageId:
        json?.id ||
        json?.messageId ||
        json?.message?.id ||
        json?.data?.id ||
        json?.data?.messageId,
      fromEmail: from.email,
    };
  }

  const res = await fetch(`${GHL_BASE_V1}/emails/`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      to: { email: to.email, name: to.name },
      from,
      subject,
      html: body,
    }),
  });
  if (!res.ok) return { success: false };
  const json = await res.json().catch(() => ({}));
  return {
    success: true,
    messageId: json?.id || json?.messageId,
    fromEmail: from.email,
  };
}

export async function sendGHLSMS(
  apiKey: string,
  toPhone: string,
  fromPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; fromNumber?: string }> {
  const res = await fetch(`${GHL_BASE_V1}/sms/`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ to: toPhone, from: fromPhone, message }),
  });
  if (!res.ok) return { success: false };
  const json = await res.json().catch(() => ({}));
  return {
    success: true,
    messageId: json?.id || json?.messageId,
    fromNumber: String(json?.from || json?.fromNumber || fromPhone || "").trim() || fromPhone,
  };
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
    name: string;
    email: string | null;
    phone: string | null;
    locationId: string;
  }
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${GHL_BASE_V2}/contacts/`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        firstName: contact.name.split(" ")[0],
        lastName: contact.name.split(" ").slice(1).join(" ") || "",
        email: contact.email,
        phone: contact.phone,
        locationId: contact.locationId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.contact?.id) return { id: String(data.contact.id) };
    if (data?.id) return { id: String(data.id) };
    return null;
  } catch (e) {
    console.warn("GHL contact create failed:", e);
    return null;
  }
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
