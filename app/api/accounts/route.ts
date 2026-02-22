import { NextResponse } from "next/server";
import { getGmailAccounts, removeGmailAccountByEmail } from "@/lib/gmailStore";

export async function GET() {
  const accounts = getGmailAccounts().map((account) => ({
    id: account.id,
    email: account.email,
    status: Date.now() < account.expiresAt ? "Active" : "Inactive",
  }));

  return NextResponse.json({
    accounts,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  removeGmailAccountByEmail(email);
  return NextResponse.json({ ok: true });
}