import { NextResponse } from "next/server";
import { ensureFreshAccessToken } from "@/lib/gmailAuth";
import { getGmailAccounts } from "@/lib/gmailStore";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convexServer";

type GmailHeader = { name?: string; value?: string };

type GmailProfile = {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

type GmailMessage = {
  id?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

type MergedMessage = {
  id: string;
  messageId: string;
  accountEmail: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
  sortTime: number;
};

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

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
  const maxResults = Math.min(Math.max(Number(requestUrl.searchParams.get("maxResults") ?? "20"), 1), 100);

  const convexClient = getConvexServerClient();
  if (convexClient) {
    try {
      const snapshot = await convexClient.query(api.emailCache.getInboxSnapshot, { maxResults });
      if (snapshot.messages.length > 0) {
        return NextResponse.json({
          profile: {
            emailAddress: "All accounts",
            messagesTotal: snapshot.messages.length,
            threadsTotal: snapshot.messages.length,
          },
          messages: snapshot.messages,
          accounts: snapshot.accounts,
          source: "convex-cache",
        });
      }
    } catch {
      // Ignore cache read errors and fall back to Gmail fetch.
    }
  }

  const accounts = getGmailAccounts();

  if (accounts.length === 0) {
    return NextResponse.json({
      profile: {
        emailAddress: "All accounts",
        messagesTotal: 0,
        threadsTotal: 0,
      },
      messages: [],
      accounts: [],
    });
  }

  const merged: MergedMessage[] = [];
  const accountSummaries: Array<{ id: string; email: string; messagesTotal: number; threadsTotal: number }> = [];

  for (const account of accounts) {
    try {
      const accessToken = await ensureFreshAccessToken(account, requestUrl.origin);

      const profile = await gmailGet<GmailProfile>(`${GMAIL_BASE_URL}/profile`, accessToken);
      accountSummaries.push({
        id: account.id,
        email: profile.emailAddress ?? account.email,
        messagesTotal: profile.messagesTotal ?? 0,
        threadsTotal: profile.threadsTotal ?? 0,
      });

      const list = await gmailGet<{ messages?: Array<{ id?: string }> }>(
        `${GMAIL_BASE_URL}/messages?labelIds=INBOX&maxResults=${maxResults}`,
        accessToken,
      );

      const messageIds = (list.messages ?? []).map((message) => message.id).filter((id): id is string => Boolean(id));

      const details = await Promise.all(
        messageIds.map((messageId) => gmailGet<GmailMessage>(`${GMAIL_BASE_URL}/messages/${messageId}?format=metadata`, accessToken)),
      );

      for (const detail of details) {
        const gmailMessageId = detail.id;
        if (!gmailMessageId) {
          continue;
        }

        const headers = detail.payload?.headers;
        const dateHeader = getHeader(headers, "date", "");
        const parsedDate = dateHeader ? Date.parse(dateHeader) : Number.NaN;
        const internalDate = detail.internalDate ? Number(detail.internalDate) : 0;

        merged.push({
          id: `${account.email}:${gmailMessageId}`,
          messageId: gmailMessageId,
          accountEmail: account.email,
          from: getHeader(headers, "from", "(Unknown Sender)"),
          subject: getHeader(headers, "subject", "(No Subject)"),
          date: dateHeader || "(No Date)",
          preview: (detail.snippet || "(No body preview)").slice(0, 400),
          sortTime: Number.isFinite(parsedDate) ? parsedDate : internalDate,
        });
      }
    } catch {
      continue;
    }
  }

  merged.sort((a, b) => b.sortTime - a.sortTime);

  if (convexClient) {
    try {
      await convexClient.mutation(api.emailCache.upsertInboxSnapshot, {
        messages: merged.map((item) => ({
          accountEmail: item.accountEmail,
          messageId: item.messageId,
          from: item.from,
          subject: item.subject,
          date: item.date,
          preview: item.preview,
          sortTime: item.sortTime,
        })),
        accounts: accountSummaries.map((account) => ({
          id: account.id,
          email: account.email,
          messagesTotal: account.messagesTotal,
          threadsTotal: account.threadsTotal,
        })),
      });
    } catch {
      // Ignore cache write errors to avoid blocking inbox responses.
    }
  }

  return NextResponse.json({
    profile: {
      emailAddress: "All accounts",
      messagesTotal: merged.length,
      threadsTotal: merged.length,
    },
    messages: merged.map((item) => ({
      id: item.id,
      messageId: item.messageId,
      accountEmail: item.accountEmail,
      from: item.from,
      subject: item.subject,
      date: item.date,
      preview: item.preview,
    })),
    accounts: accountSummaries,
    source: "gmail-live",
  });
}