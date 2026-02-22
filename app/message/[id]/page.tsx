"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import MessageBody from "../../components/MessageBody";

const THEME_CACHE_KEY = "gmail-ui-theme-v1";

type UiTheme = "light" | "dark";

type MessageDetail = {
  id: string;
  messageId: string;
  accountEmail: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
  body: string;
  error?: string;
};

export default function MessagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const messageId = typeof params.id === "string" ? params.id : null;
  const accountEmail = searchParams.get("accountEmail");
  const missingParams = !messageId || !accountEmail;

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<UiTheme>("light");
  const isLight = theme === "light";

  useEffect(() => {
    const cachedTheme = localStorage.getItem(THEME_CACHE_KEY);
    setTheme(cachedTheme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (missingParams) {
      return;
    }

    const query = new URLSearchParams({
      messageId: messageId!,
      accountEmail: accountEmail!,
    });

    fetch(`/api/message?${query.toString()}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<MessageDetail>)
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setError(null);
        setMessage(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load message.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountEmail, messageId, missingParams]);

  if (missingParams) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${isLight ? "bg-[#f6f8fc] text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-1">Missing message id or account email.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${isLight ? "bg-[#f6f8fc] text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <p className={`text-sm ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>Loading message...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${isLight ? "bg-[#f6f8fc] text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      </main>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <main className={`min-h-screen ${isLight ? "bg-[#f6f8fc] text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className={`mb-6 border-b pb-6 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
          <h1 className={`text-2xl font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>{message.subject}</h1>
          <div className="mt-3 flex flex-col gap-1 text-sm">
            <p>
              <span className={isLight ? "text-zinc-500" : "text-zinc-500"}>From: </span>
              <span className={isLight ? "text-zinc-700" : "text-zinc-300"}>{message.from}</span>
            </p>
            <p>
              <span className={isLight ? "text-zinc-500" : "text-zinc-500"}>Date: </span>
              <span className={isLight ? "text-zinc-600" : "text-zinc-400"}>{message.date}</span>
            </p>
            <p>
              <span className={isLight ? "text-zinc-500" : "text-zinc-500"}>Account: </span>
              <span className={isLight ? "text-zinc-600" : "text-zinc-400"}>{message.accountEmail}</span>
            </p>
          </div>
        </div>

        <div className={`rounded-lg border p-6 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-900/30"}`}>
          <MessageBody bodyHtml={message.bodyHtml} bodyText={message.bodyText || message.body} />
        </div>
      </div>
    </main>
  );
}
