import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/gmailAuth";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  let clientId: string;
  let redirectUri: string;

  try {
    const config = getOAuthConfig(origin);
    clientId = config.clientId;
    redirectUri = config.redirectUri;
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth config error";
    const destination = new URL("/settings", origin);
    destination.searchParams.set("error", "oauth_config_missing");
    destination.searchParams.set("message", message);
    return NextResponse.redirect(destination);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 10,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}