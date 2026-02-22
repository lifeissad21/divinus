"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";

type ConnectedAccount = {
  id: string;
  email: string;
  status: "Active" | "Inactive";
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingEmail, setDisconnectingEmail] = useState<string | null>(null);

  const isLight = themeReady ? resolvedTheme !== "dark" : false;
  const selectedTheme = themeReady ? theme : null;
  const effectiveThemeLabel = themeReady ? (resolvedTheme === "dark" ? "Dark" : "Light") : "...";

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    fetch("/api/accounts", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ accounts?: ConnectedAccount[] }>)
      .then((data) => {
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const grouped = useMemo(() => {
    const primary = accounts[0] ?? null;
    const secondary = accounts.slice(1);
    return { primary, secondary };
  }, [accounts]);

  const oauthError = searchParams.get("error");
  const oauthMessage = searchParams.get("message");

  async function handleDisconnect(email: string) {
    try {
      setDisconnectingEmail(email);
      const response = await fetch(`/api/accounts?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      setAccounts((current) => current.filter((account) => account.email !== email));
    } finally {
      setDisconnectingEmail(null);
    }
  }

  return (
    <main className={`min-h-screen ${isLight ? "bg-[#f6f4f5] text-zinc-900" : "bg-[#0f1115] text-zinc-100"}`}>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <Link href="/" className={`mb-6 inline-flex items-center gap-1.5 text-sm font-medium ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>
          <ChevronLeft className="h-4 w-4" />
          Back to Inbox
        </Link>

        <h1 className="text-[38px] font-semibold tracking-tight">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profile, connected accounts, and preferences.</p>

        {oauthError ? (
          <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${isLight ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-700 bg-amber-950/40 text-amber-200"}`}>
            <p className="font-medium">Google OAuth setup needed</p>
            <p className="mt-1">{oauthMessage || "Configure Gmail OAuth environment variables and try Connect again."}</p>
            <p className="mt-1 text-xs opacity-80">Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, optional: GMAIL_REDIRECT_URI.</p>
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          <section className={`rounded-xl border p-5 ${isLight ? "border-zinc-300/40 bg-[#f8f7f7]" : "border-zinc-700 bg-zinc-900/70"}`}>
            <h2 className="text-2xl font-semibold">Profile</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-md border px-3 py-2 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                <p className="text-xs text-muted-foreground">Display name</p>
                <p className="mt-1 font-medium">{grouped.primary?.email.split("@")[0] ?? "Not connected"}</p>
              </div>
              <div className={`rounded-md border px-3 py-2 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                <p className="text-xs text-muted-foreground">Primary email</p>
                <p className="mt-1 truncate font-medium">{grouped.primary?.email ?? "Not connected"}</p>
              </div>
            </div>
          </section>

          <section className={`rounded-xl border p-5 ${isLight ? "border-zinc-300/40 bg-[#f8f7f7]" : "border-zinc-700 bg-zinc-900/70"}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Connected accounts</h2>
              <a
                href="/api/auth/login"
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-[15px] ${isLight ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
              >
                <Plus className="h-4 w-4" />
                Connect
              </a>
            </div>

            <div className={`mt-4 overflow-hidden rounded-xl border ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
              <div className={`grid grid-cols-[1fr_110px_110px] px-5 py-3 text-sm ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                <span>Name</span>
                <span>Status</span>
                <span />
              </div>

              {loading ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">No connected Google accounts yet.</div>
              ) : (
                <>
                  {grouped.primary ? (
                    <div className={`grid grid-cols-[1fr_110px_110px] items-center border-t px-5 py-3 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{grouped.primary.email.split("@")[0]}</p>
                        <p className="truncate text-sm text-muted-foreground">{grouped.primary.email} · Primary account</p>
                      </div>
                      <p className="text-sm">{grouped.primary.status}</p>
                      <button
                        onClick={() => {
                          void handleDisconnect(grouped.primary.email);
                        }}
                        disabled={disconnectingEmail === grouped.primary.email}
                        className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${isLight ? "border-zinc-300 hover:bg-zinc-200" : "border-zinc-600 hover:bg-zinc-800"}`}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : null}

                  {grouped.secondary.map((account) => (
                    <div key={account.id} className={`grid grid-cols-[1fr_110px_110px] items-center border-t px-5 py-3 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{account.email.split("@")[0]}</p>
                        <p className="truncate text-sm text-muted-foreground">{account.email}</p>
                      </div>
                      <p className="text-sm">{account.status}</p>
                      <button
                        onClick={() => {
                          void handleDisconnect(account.email);
                        }}
                        disabled={disconnectingEmail === account.email}
                        className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${isLight ? "border-zinc-300 hover:bg-zinc-200" : "border-zinc-600 hover:bg-zinc-800"}`}
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          <section className={`rounded-xl border p-5 ${isLight ? "border-zinc-300/40 bg-[#f8f7f7]" : "border-zinc-700 bg-zinc-900/70"}`}>
            <h2 className="text-2xl font-semibold">Preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">Theme preference persists across the whole website.</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => setTheme("light")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedTheme === "light" ? "border-blue-500" : ""}`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedTheme === "dark" ? "border-blue-500" : ""}`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedTheme === "system" ? "border-blue-500" : ""}`}
              >
                System
              </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">Current effective theme: {effectiveThemeLabel}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
