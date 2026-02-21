import { NextResponse } from "next/server";
import { ensureFreshAccessToken } from "@/lib/gmailAuth";
import { getGmailAccountByEmail } from "@/lib/gmailStore";

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
  return headers?.find((header) => header.name?.toLowerCase() === key.toLowerCase())?.value ?? fallback;
}

async function gmailGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const messageId = requestUrl.searchParams.get("messageId")?.trim();
  const accountEmail = requestUrl.searchParams.get("accountEmail")?.trim();

  if (!messageId || !accountEmail) {
    return NextResponse.json({ error: "Missing messageId or accountEmail." }, { status: 400 });
  }

  const account = getGmailAccountByEmail(accountEmail);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  try {
    const accessToken = await ensureFreshAccessToken(account, requestUrl.origin);
    const message = await gmailGet<GmailMessage>(`${GMAIL_BASE_URL}/messages/${messageId}?format=full`, accessToken);

    const headers = message.payload?.headers;
    const from = getHeader(headers, "from", "(Unknown Sender)");
    const subject = getHeader(headers, "subject", "(No Subject)");
    const date = getHeader(headers, "date", "(No Date)");

    const bodyText = message.payload?.body?.data
      ? decodeBase64Url(message.payload.body.data)
      : findPartByMime(message.payload?.parts, "text/plain");
    const bodyHtml = findPartByMime(message.payload?.parts, "text/html");

    return NextResponse.json({
      id: message.id ?? messageId,
      messageId,
      accountEmail,
      from,
      subject,
      date,
      preview: message.snippet ?? "",
      bodyText: bodyText.trim(),
      bodyHtml: bodyHtml.trim(),
      body: bodyText.trim() || message.snippet || "(No message body available)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}