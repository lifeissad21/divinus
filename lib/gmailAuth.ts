import { addOrUpdateGmailAccount, type GmailAccount } from "./gmailStore";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

function firstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function getOAuthConfig(origin: string) {
  const clientId = firstEnv(["GMAIL_CLIENT_ID", "GOOGLE_CLIENT_ID", "NEXT_PUBLIC_GOOGLE_CLIENT_ID"]);
  const clientSecret = firstEnv(["GMAIL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]);
  const redirectUri =
    firstEnv(["GMAIL_REDIRECT_URI", "GOOGLE_REDIRECT_URI"]) || `${origin}/api/auth/callback`;

  if (!clientId) {
    throw new Error("Missing OAuth config: set GMAIL_CLIENT_ID (or GOOGLE_CLIENT_ID).");
  }

  if (!clientSecret) {
    throw new Error("Missing OAuth config: set GMAIL_CLIENT_SECRET (or GOOGLE_CLIENT_SECRET).");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

export async function exchangeCodeForTokens(args: {
  code: string;
  origin: string;
}): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig(args.origin);

  const body = new URLSearchParams({
    code: args.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as TokenResponse & { error?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to exchange authorization code.");
  }

  return data;
}

export async function refreshAccessToken(args: {
  refreshToken: string;
  origin: string;
}): Promise<{ accessToken: string; expiresAt: number }> {
  const { clientId, clientSecret } = getOAuthConfig(args.origin);

  const body = new URLSearchParams({
    refresh_token: args.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh access token.");
  }

  const ttlSeconds = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3500;

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

export async function ensureFreshAccessToken(account: GmailAccount, origin: string): Promise<string> {
  if (Date.now() < account.expiresAt - 30_000) {
    return account.accessToken;
  }

  const refreshed = await refreshAccessToken({
    refreshToken: account.refreshToken,
    origin,
  });

  addOrUpdateGmailAccount({
    ...account,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
  });

  return refreshed.accessToken;
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch(GMAIL_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = (await response.json()) as { emailAddress?: string; error?: { message?: string } };
  if (!response.ok || !data.emailAddress) {
    throw new Error(data.error?.message || "Could not fetch Google account email.");
  }

  return data.emailAddress;
}