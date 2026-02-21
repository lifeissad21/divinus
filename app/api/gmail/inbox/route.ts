import { NextResponse } from "next/server";

type GmailProfile = {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessage = {
  id?: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
  };
};

type InboxItem = {
  id: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
};

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

function decodeBase64Url(value: string): string {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const binary = Buffer.from(padded, "base64");
    return binary.toString("utf-8");
  } catch {
    return "";
  }
}

function findPartByMime(parts: GmailPart[] | undefined, mime: string): string {
  if (!parts || parts.length === 0) {
    return "";
  }

  for (const part of parts) {
    if (part.mimeType === mime && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }

    const nested = findPartByMime(part.parts, mime);
    if (nested) {
      return nested;
    }
  }

  return "";
}

function getHeader(headers: GmailHeader[] | undefined, key: string, fallback: string): string {
  return (
    headers?.find((header) => header.name?.toLowerCase() === key.toLowerCase())?.value ?? fallback
  );
}

async function gmailGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Gmail request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string; maxResults?: number };
    const accessToken = body.accessToken?.trim();
    const maxResults = Math.min(Math.max(body.maxResults ?? 30, 1), 100);

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 400 });
    }

    const profile = await gmailGet<GmailProfile>(`${GMAIL_BASE_URL}/profile`, accessToken);
    const list = await gmailGet<{ messages?: Array<{ id?: string }> }>(
      `${GMAIL_BASE_URL}/messages?labelIds=INBOX&maxResults=${maxResults}`,
      accessToken,
    );

    const messageIds = (list.messages ?? [])
      .map((message) => message.id)
      .filter((id): id is string => Boolean(id));

    const detailResponses = await Promise.all(
      messageIds.map((id) =>
        gmailGet<GmailMessage>(`${GMAIL_BASE_URL}/messages/${id}?format=full`, accessToken),
      ),
    );

    const messages: InboxItem[] = detailResponses.map((message) => {
      const headers = message.payload?.headers;
      const rootMime = message.payload?.body?.data ? "text/plain" : null;
      const bodyText = rootMime === "text/plain"
        ? decodeBase64Url(message.payload!.body!.data!)
        : findPartByMime(message.payload?.parts, "text/plain");
      const bodyHtml = findPartByMime(message.payload?.parts, "text/html");

      return {
        id: message.id ?? crypto.randomUUID(),
        from: getHeader(headers, "from", "(Unknown Sender)"),
        subject: getHeader(headers, "subject", "(No Subject)"),
        date: getHeader(headers, "date", "(No Date)"),
        preview: (bodyText.trim() || message.snippet || "(No body preview)").slice(0, 400),
        bodyText: bodyText.trim(),
        bodyHtml: bodyHtml.trim(),
      };
    });

    return NextResponse.json({
      profile: {
        emailAddress: profile.emailAddress ?? "unknown",
        messagesTotal: profile.messagesTotal ?? 0,
        threadsTotal: profile.threadsTotal ?? 0,
      },
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}