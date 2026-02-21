import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/gmailAuth";
import { addOrUpdateGmailAccount, getGmailAccountByEmail } from "@/lib/gmailStore";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const state = requestUrl.searchParams.get("state")?.trim();

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", requestUrl.origin));
  }

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", requestUrl.origin));
  }

  try {
    const tokenData = await exchangeCodeForTokens({
      code,
      origin: requestUrl.origin,
    });

    const email = await fetchGoogleEmail(tokenData.access_token);
    const existing = getGmailAccountByEmail(email);

    const refreshToken = tokenData.refresh_token || existing?.refreshToken;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/settings?error=missing_refresh_token", requestUrl.origin));
    }

    const ttlSeconds = tokenData.expires_in > 0 ? tokenData.expires_in : 3500;

    addOrUpdateGmailAccount({
      id: existing?.id ?? crypto.randomUUID(),
      email,
      accessToken: tokenData.access_token,
      refreshToken,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return NextResponse.redirect(new URL("/settings?connected=1", requestUrl.origin));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed";
    const destination = new URL("/settings", requestUrl.origin);
    destination.searchParams.set("error", "oauth_failed");
    destination.searchParams.set("message", message);
    return NextResponse.redirect(destination);
  }
}