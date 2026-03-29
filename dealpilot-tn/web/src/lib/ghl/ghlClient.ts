export type GHLContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
};

const GHL_BASE_V2 = "https://services.leadconnectorhq.com";

function authHeaders(
  apiKey: string,
  version = "2021-04-15"
): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: version,
  };
}

/** Same as authHeaders but Authorization shows only last 4 chars of the API key (debug logs). */
function authHeadersForDebugLog(apiKey: string): Record<string, string> {
  const last4 = apiKey.length >= 4 ? apiKey.slice(-4) : "****";
  return {
    Authorization: `Bearer ****${last4}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-04-15",
  };
}

export async function sendGHLEmail(
  apiKey: string,
  to: { email: string; name: string; ghlContactId?: string | null },
  from: { email: string; name: string },
  subject: string,
  body: string,
  locationId?: string | null,
  message?: string | null
): Promise<{ success: boolean; messageId?: string; fromEmail?: string; error?: string }> {
  const ghlContactId = String(to.ghlContactId || "").trim();
  const loc = String(locationId || "").trim();

  // Debug: everything we know before any GHL HTTP call (no secrets beyond masked key).
  console.log("[ghlClient] sendGHLEmail preflight (no request yet)", {
    branch: "v2_conversations_messages",
    hasGhlContactId: Boolean(ghlContactId),
    hasApiKey: Boolean(apiKey),
    to,
    from,
    subject,
    body,
    locationId: loc || null,
  });

  if (!ghlContactId) {
    return {
      success: false,
      error: "Contact must be synced to GHL before sending email",
    };
  }

  console.log(
    "[ghlClient] email body param:",
    String(body || message || "").slice(0, 100)
  );

  const url = `${GHL_BASE_V2}/conversations/messages`;
  const requestBody = JSON.stringify({
    type: "Email",
    contactId: ghlContactId,
    subject,
    html: body || message || "",
    body: body || message || "",
    locationId: loc || undefined,
  });
  console.log("[ghlClient] GHL email direct request (v2)", {
    url,
    headers: authHeadersForDebugLog(apiKey),
    body: requestBody,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders(apiKey, "2021-07-28"),
      body: requestBody,
      signal: controller.signal,
    });
  } catch (err) {
    console.log("[ghlClient] sendGHLEmail fetch error:", err);
    return { success: false };
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await res.text();
  console.log("[ghlClient] GHL email direct response (v2)", {
    status: res.status,
    body: responseText,
  });
  if (!res.ok) return { success: false };
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return {
    success: true,
    messageId:
      json?.id ||
      json?.messageId ||
      (json?.message as Record<string, unknown> | undefined)?.id ||
      (json?.data as Record<string, unknown> | undefined)?.id ||
      (json?.data as Record<string, unknown> | undefined)?.messageId,
    fromEmail: from.email,
  };
}

export async function sendGHLSMS(
  apiKey: string,
  toPhone: string,
  fromPhone: string,
  message: string,
  ghlContactId?: string | null,
  locationId?: string | null
): Promise<{ success: boolean; messageId?: string; fromNumber?: string }> {
  const contactId = String(ghlContactId || "").trim();
  const loc = String(locationId || "").trim();

  const digits = toPhone.replace(/\D/g, "");
  const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

  const url = `${GHL_BASE_V2}/conversations/messages`;
  const body = JSON.stringify({
    type: "SMS",
    contactId: contactId || undefined,
    ...(contactId ? {} : { toNumber: e164 }),
    message,
    ...(loc ? { locationId: loc } : {}),
  });

  console.log("[ghlClient] sendGHLSMS v2 request", {
    url,
    hasContactId: !!contactId,
    hasPhone: !!toPhone,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders(apiKey),
      body,
      signal: controller.signal,
    });
  } catch (err) {
    console.log("[ghlClient] sendGHLSMS fetch error:", err);
    return { success: false };
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await res.text();
  console.log("[ghlClient] sendGHLSMS v2 response", {
    status: res.status,
    body: responseText,
  });

  if (!res.ok) return { success: false };

  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    json = {};
  }

  return {
    success: true,
    messageId: json?.messageId || json?.id,
    fromNumber: fromPhone,
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
  const url = `${GHL_BASE_V2}/contacts/`;
  try {
    console.log("[createGHLContact] request:", {
      url,
      hasApiKey: !!apiKey,
      locationId: contact.locationId,
      name: contact.name,
      email: contact.email,
    });
    const res = await fetch(url, {
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
    const responseText = await res.text();
    console.log("[createGHLContact] response:", {
      status: res.status,
      body: responseText,
    });
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      json = {};
    }

    // If duplicate contact exists, use that ID
    if (res.status === 400) {
      const meta = json?.meta as Record<string, unknown> | undefined;
      const existingId = meta?.contactId;
      if (existingId && typeof existingId === "string") {
        console.log("[createGHLContact] duplicate found, using existing id:", existingId);
        return { id: existingId };
      }
      console.warn("[createGHLContact] 400 error:", responseText);
      return null;
    }

    if (!res.ok) return null;

    // parse success response for id
    const contactId = (json?.contact as any)?.id || json?.id;
    if (!contactId) return null;
    return { id: String(contactId) };
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
