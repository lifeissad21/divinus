import { NextResponse } from "next/server";
import { ensureFreshAccessToken } from "@/lib/gmailAuth";
import { getGmailAccountByEmail } from "@/lib/gmailStore";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convexServer";

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

  const convexClient = getConvexServerClient();
  if (convexClient) {
    try {
      const cached = await convexClient.query(api.emailCache.getMessageDetail, {
        accountEmail,
        messageId,
      });

      if (cached?.body || cached?.bodyHtml || cached?.bodyText) {
        return NextResponse.json({
          id: cached.id,
          messageId: cached.messageId,
          accountEmail: cached.accountEmail,
          from: cached.from,
          subject: cached.subject,
          date: cached.date,
          preview: cached.preview,
          bodyText: cached.bodyText ?? "",
          bodyHtml: cached.bodyHtml ?? "",
          body: cached.body ?? cached.bodyText ?? cached.preview,
          source: "convex-cache",
        });
      }
    } catch {
      // Ignore cache read errors and continue with Gmail fetch.
    }
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

    const parsedDate = date ? Date.parse(date) : Number.NaN;
    const bodyTextTrimmed = bodyText.trim();
    const bodyHtmlTrimmed = bodyHtml.trim();
    const body = bodyTextTrimmed || message.snippet || "(No message body available)";

    if (convexClient) {
      try {
        await convexClient.mutation(api.emailCache.upsertMessageDetail, {
          accountEmail,
          messageId,
          from,
          subject,
          date,
          preview: message.snippet ?? "",
          bodyText: bodyTextTrimmed,
          bodyHtml: bodyHtmlTrimmed,
          body,
          sortTime: Number.isFinite(parsedDate) ? parsedDate : Date.now(),
        });
      } catch {
        // Ignore cache write errors to avoid blocking message responses.
      }
    }

    return NextResponse.json({
      id: message.id ?? `${accountEmail}:${messageId}`,
      messageId,
      accountEmail,
      from,
      subject,
      date,
      preview: message.snippet ?? "",
      bodyText: bodyTextTrimmed,
      bodyHtml: bodyHtmlTrimmed,
      body,
      source: "gmail-live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}