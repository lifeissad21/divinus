import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string; messageId?: string };
    const accessToken = body.accessToken?.trim();
    const messageId = body.messageId?.trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 400 });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing message id." }, { status: 400 });
    }

    const response = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}?format=full`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || `Gmail request failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const message = (await response.json()) as GmailMessage;
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
