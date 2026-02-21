"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Ellipsis, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

type UiTheme = "light" | "dark";

type ConnectedAccount = {
  id: string;
  email: string;
  status: "Active" | "Inactive";
};

const THEME_CACHE_KEY = "gmail-ui-theme-v1";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [theme] = useState<UiTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const cachedTheme = localStorage.getItem(THEME_CACHE_KEY);
    return cachedTheme === "dark" ? "dark" : "light";
  });
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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

  return (
    <main className={`min-h-screen ${isLight ? "bg-[#f6f4f5] text-zinc-900" : "bg-[#0f1115] text-zinc-100"}`}>
      <div className="flex min-h-screen">
        <aside className={`w-[216px] shrink-0 border-r px-4 py-4 ${isLight ? "border-zinc-300/60 bg-[#ece9ea]" : "border-zinc-800 bg-[#101318]"}`}>
          <Link href="/" className={`mb-5 inline-flex items-center gap-1.5 text-sm font-medium ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>
            <ChevronLeft className="h-4 w-4" />
            Back to Inbox
          </Link>

          <div className="space-y-1.5 text-sm">
            <p className="pt-2 text-sm font-semibold text-muted-foreground">Account</p>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Profile</button>
            <button className={`block w-full rounded-md border px-2 py-1.5 text-left ${isLight ? "border-blue-400 bg-zinc-100" : "border-blue-500 bg-zinc-900"}`}>
              Connected accounts
            </button>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Preferences</button>

            <p className="pt-4 text-sm font-semibold text-muted-foreground">Features</p>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Labels</button>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Blocked senders</button>

            <p className="pt-4 text-sm font-semibold text-muted-foreground">Organization</p>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Workspace</button>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Members</button>
            <button className="block w-full rounded-md px-2 py-1.5 text-left">Billing</button>
          </div>
        </aside>

        <section className="flex-1 px-10 py-16">
          <div className="mx-auto max-w-[580px]">
            <h1 className="text-[38px] font-semibold tracking-tight">Connected accounts</h1>

            {oauthError ? (
              <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${isLight ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-700 bg-amber-950/40 text-amber-200"}`}>
                <p className="font-medium">Google OAuth setup needed</p>
                <p className="mt-1">
                  {oauthMessage || "Configure Gmail OAuth environment variables and try Connect again."}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, optional: GMAIL_REDIRECT_URI.
                </p>
              </div>
            ) : null}

            <div className="mt-8">
              <h2 className="mb-3 text-[31px] font-semibold">Google accounts</h2>
              <div className={`overflow-hidden rounded-xl border ${isLight ? "border-zinc-300/40 bg-[#f8f7f7]" : "border-zinc-700 bg-zinc-900/70"}`}>
                <div className={`grid grid-cols-[1fr_110px_36px] px-5 py-3 text-sm ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
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
                      <div className={`grid grid-cols-[1fr_110px_36px] items-center border-t px-5 py-3 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{grouped.primary.email.split("@")[0]}</p>
                          <p className="truncate text-sm text-muted-foreground">{grouped.primary.email} · Primary account</p>
                        </div>
                        <p className="text-sm">{grouped.primary.status}</p>
                        <button className="inline-flex items-center justify-center text-muted-foreground">
                          <Ellipsis className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}

                    {grouped.secondary.map((account) => (
                      <div key={account.id} className={`grid grid-cols-[1fr_110px_36px] items-center border-t px-5 py-3 ${isLight ? "border-zinc-300/40" : "border-zinc-700"}`}>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{account.email.split("@")[0]}</p>
                          <p className="truncate text-sm text-muted-foreground">{account.email}</p>
                        </div>
                        <p className="text-sm">{account.status}</p>
                        <button className="inline-flex items-center justify-center text-muted-foreground">
                          <Ellipsis className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-[31px] font-semibold">Add account</h2>
              <div className={`flex items-center justify-between rounded-xl border px-5 py-5 ${isLight ? "border-zinc-300/40 bg-[#f8f7f7]" : "border-zinc-700 bg-zinc-900/70"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌈</span>
                  <span className="text-lg font-medium">Google account</span>
                </div>
                <a
                  href="/api/auth/login"
                  className={`inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-[15px] ${isLight ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
                >
                  <Plus className="h-4 w-4" />
                  Connect
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
