import type { InboxMessage } from "@/app/components/inbox-types";

export type InboxFilterLogic = "AND" | "OR";

export type CustomInboxFilters = {
  senders: string[];
  topics: string[];
  keywords: string[];
};

export type CustomInbox = {
  id: string;
  name: string;
  pinned: boolean;
  logic: InboxFilterLogic;
  filters: CustomInboxFilters;
  createdAt: string;
};

const CUSTOM_INBOXES_STORAGE_KEY = "custom-inboxes-v1";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function parseSender(from: string): string {
  const senderName = from.split("<")[0]?.trim() ?? from;
  return senderName;
}

export function readCustomInboxesFromStorage(): CustomInbox[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_INBOXES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CustomInbox[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
  } catch {
    return [];
  }
}

export function writeCustomInboxesToStorage(inboxes: CustomInbox[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_INBOXES_STORAGE_KEY, JSON.stringify(inboxes));
}

export function createCustomInboxId(name: string): string {
  const slug = normalizeText(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 42);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug || "inbox"}-${suffix}`;
}

function matchAny(terms: string[], source: string): boolean {
  const normalizedTerms = terms.map(normalizeText).filter(Boolean);
  if (normalizedTerms.length === 0) {
    return false;
  }

  return normalizedTerms.some((term) => source.includes(term));
}

export function doesMessageMatchCustomInbox(message: InboxMessage, inbox: CustomInbox): boolean {
  const sender = normalizeText(parseSender(message.from));
  const subject = normalizeText(message.subject ?? "");
  const preview = normalizeText(message.preview ?? "");
  const content = `${subject} ${preview}`;

  const checks: boolean[] = [];

  if (inbox.filters.senders.length > 0) {
    checks.push(matchAny(inbox.filters.senders, sender));
  }

  if (inbox.filters.topics.length > 0) {
    checks.push(matchAny(inbox.filters.topics, subject));
  }

  if (inbox.filters.keywords.length > 0) {
    checks.push(matchAny(inbox.filters.keywords, content));
  }

  if (checks.length === 0) {
    return false;
  }

  if (inbox.logic === "OR") {
    return checks.some(Boolean);
  }

  return checks.every(Boolean);
}

export function matchesAnyCustomInbox(message: InboxMessage, inboxes: CustomInbox[]): boolean {
  return inboxes.some((inbox) => doesMessageMatchCustomInbox(message, inbox));
}

export function getSenderSuggestions(messages: InboxMessage[]): string[] {
  const unique = new Set<string>();
  for (const message of messages) {
    const sender = parseSender(message.from).trim();
    if (sender) {
      unique.add(sender);
    }
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}
