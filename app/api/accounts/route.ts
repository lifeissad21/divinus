import { NextResponse } from "next/server";
import { getGmailAccounts } from "@/lib/gmailStore";

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