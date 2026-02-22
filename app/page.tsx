"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import CreateInboxDialog from "./components/create-inbox-dialog";
import InboxCommandDialog from "./components/inbox-command-dialog";
import InboxHeader from "./components/inbox-header";
import InboxListPane from "./components/inbox-list-pane";
import type {
  InboxMessage,
  InboxProfile,
  MessageDetail,
  UiTheme,
} from "./components/inbox-types";
import MailboxSidebar from "./components/mailbox-sidebar";
import MessagePreviewPane from "./components/message-preview-pane";
import {
  doesMessageMatchCustomInbox,
  getSenderSuggestions,
  matchesAnyCustomInbox,
  readCustomInboxesFromStorage,
  writeCustomInboxesToStorage,
  type CustomInbox,
} from "@/lib/customInboxes";

type InboxResponse = {
  profile: InboxProfile;
  messages: InboxMessage[];
  error?: string;
};

const INBOX_TOAST_ID = "inbox-refresh";

export default function Home() {
  const [statusText, setStatusText] = useState("Connect Gmail accounts in Settings to load your inbox.");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mailbox, setMailbox] = useState<InboxProfile | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [inboxFilterQuery, setInboxFilterQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [createInboxOpen, setCreateInboxOpen] = useState(false);
  const [customInboxes, setCustomInboxes] = useState<CustomInbox[]>([]);
  const [activeInboxId, setActiveInboxId] = useState<string>("important");
  const [themeReady, setThemeReady] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const selectedRowRef = useRef<HTMLElement | null>(null);
  const selectedMessageIdRef = useRef<string | null>(null);
  const isLight = themeReady ? resolvedTheme !== "dark" : false;

  useEffect(() => {
    selectedMessageIdRef.current = selectedMessageId;
  }, [selectedMessageId]);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    setCustomInboxes(readCustomInboxesFromStorage());
  }, []);

  useEffect(() => {
    writeCustomInboxesToStorage(customInboxes);
  }, [customInboxes]);

  const fetchMessageDetail = useCallback(async (params: { messageId: string; accountEmail: string; rowId?: string }) => {
    try {
      setDetailLoading(true);
      setIsPreviewOpen(true);
      if (params.rowId) {
        setSelectedMessageId(params.rowId);
      }

      const query = new URLSearchParams({
        messageId: params.messageId,
        accountEmail: params.accountEmail,
      });

      const response = await fetch(`/api/message?${query.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as MessageDetail;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to load message.");
      }

      setSelectedMessage(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchInboxFromApi = useCallback(async () => {
    try {
      setLoading(true);
      setStatusText("Loading inbox...");
      toast.loading("Loading inbox...", { id: INBOX_TOAST_ID });

      const response = await fetch("/api/inbox?maxResults=25", {
        cache: "no-store",
      });

      const data = (await response.json()) as InboxResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to load inbox.");
      }

      setMailbox(data.profile);
      setMessages(data.messages);

      if (data.messages.length === 0) {
        setSelectedMessageId(null);
        setSelectedMessage(null);
        const emptyMessage = "No inbox messages found. Add accounts in Settings.";
        setStatusText(emptyMessage);
        toast.info(emptyMessage, { id: INBOX_TOAST_ID });
        return;
      }

      const active = data.messages.find((message) => message.id === selectedMessageIdRef.current);
      const next = active ?? data.messages[0];

      if (next) {
        setSelectedMessageId(next.id);
        void fetchMessageDetail({
          messageId: next.messageId,
          accountEmail: next.accountEmail,
          rowId: next.id,
        });
      }

      const loadedMessage = "Inbox loaded.";
      setStatusText(loadedMessage);
      toast.success(loadedMessage, { id: INBOX_TOAST_ID });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(message);
      toast.error(message, { id: INBOX_TOAST_ID });
    } finally {
      setLoading(false);
    }
  }, [fetchMessageDetail]);

  useEffect(() => {
    void fetchInboxFromApi();
  }, [fetchInboxFromApi]);

  const openMessageInNewWindow = useCallback((params: { messageId: string; accountEmail: string }) => {
    const query = new URLSearchParams({ accountEmail: params.accountEmail });
    window.open(`/message/${encodeURIComponent(params.messageId)}?${query.toString()}`, "_blank", "noopener,noreferrer");
  }, []);

  const pinnedInboxes = useMemo(
    () => customInboxes.filter((inbox) => inbox.pinned),
    [customInboxes]
  );

  const senderSuggestions = useMemo(() => getSenderSuggestions(messages), [messages]);

  const inboxMessages = useMemo(() => {
    if (activeInboxId === "important") {
      return messages;
    }

    if (activeInboxId === "other") {
      return messages.filter((message) => !matchesAnyCustomInbox(message, customInboxes));
    }

    const customInbox = customInboxes.find((inbox) => inbox.id === activeInboxId);
    if (!customInbox) {
      return messages;
    }

    return messages.filter((message) => doesMessageMatchCustomInbox(message, customInbox));
  }, [activeInboxId, customInboxes, messages]);

  useEffect(() => {
    if (inboxMessages.length === 0) {
      setSelectedMessageId(null);
      setSelectedMessage(null);
      return;
    }

    const selectedStillVisible = inboxMessages.some((message) => message.id === selectedMessageIdRef.current);
    if (selectedStillVisible) {
      return;
    }

    const next = inboxMessages[0];
    setSelectedMessageId(next.id);
    void fetchMessageDetail({
      messageId: next.messageId,
      accountEmail: next.accountEmail,
      rowId: next.id,
    });
  }, [fetchMessageDetail, inboxMessages]);

  const accountName = mailbox?.emailAddress?.split("@")[0] ?? "Accounts";
  const accountInitial = accountName.charAt(0).toUpperCase() || "A";

  useEffect(() => {
    const handleKeyNavigation = (event: KeyboardEvent) => {
      if (commandOpen || messages.length === 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsPreviewOpen(false);
        return;
      }

      if (event.key === "Enter") {
        const selected = messages.find((message) => message.id === selectedMessageId);
        if (selected) {
          openMessageInNewWindow({
            messageId: selected.messageId,
            accountEmail: selected.accountEmail,
          });
        }
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      event.preventDefault();

      const currentIndex = messages.findIndex((message) => message.id === selectedMessageId);
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, messages.length - 1)
          : Math.max(currentIndex - 1, 0);

      const nextMessage = messages[nextIndex];
      if (nextMessage && nextMessage.id !== selectedMessageId) {
        setSelectedMessageId(nextMessage.id);
        void fetchMessageDetail({
          messageId: nextMessage.messageId,
          accountEmail: nextMessage.accountEmail,
          rowId: nextMessage.id,
        });

        setTimeout(() => {
          selectedRowRef.current?.scrollIntoView({ block: "nearest" });
        }, 0);
      }
    };

    window.addEventListener("keydown", handleKeyNavigation);
    return () => {
      window.removeEventListener("keydown", handleKeyNavigation);
    };
  }, [commandOpen, fetchMessageDetail, messages, openMessageInNewWindow, selectedMessageId]);

  useEffect(() => {
    const handleCommandPaletteShortcut = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) {
        return;
      }

      event.preventDefault();
      setCommandOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleCommandPaletteShortcut);
    return () => {
      window.removeEventListener("keydown", handleCommandPaletteShortcut);
    };
  }, []);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16.5rem",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
      className={isLight ? "bg-[#f6f7f9] text-zinc-900" : "bg-[#0f1115] text-zinc-100"}
    >
      <MailboxSidebar
        isLight={isLight}
        accountInitial={accountInitial}
        accountName={accountName}
        emailAddress={mailbox?.emailAddress}
        mailboxCount={mailbox?.messagesTotal ?? messages.length}
        onRefreshInbox={() => {
          void fetchInboxFromApi();
        }}
        onSetTheme={setTheme}
        onOpenSettings={() => {
          window.location.assign("/settings");
        }}
        onAuthClick={() => {
          window.location.assign("/settings");
        }}
        onSignoutClick={() => {
          window.location.assign("/settings");
        }}
        loading={loading}
        authorizeVisible={false}
        signoutVisible={false}
        authorizeText="Settings"
        customInboxes={customInboxes}
        activeInboxId={activeInboxId}
        onSelectInbox={setActiveInboxId}
      />

      <SidebarInset className={`${isLight ? "bg-[#f6f7f9]" : "bg-[#0f1115]"} h-svh overflow-hidden`}>
        <InboxHeader
          isLight={isLight}
          filterQuery={inboxFilterQuery}
          onFilterQueryChange={setInboxFilterQuery}
          activeInboxId={activeInboxId}
          pinnedInboxes={pinnedInboxes}
          onSelectInbox={setActiveInboxId}
          onCreateInbox={() => {
            setCreateInboxOpen(true);
          }}
        />

        <div className={`flex min-h-0 flex-1 overflow-hidden border-t px-0 pb-0 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
          <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={isPreviewOpen ? 64 : 100} minSize={38} className="min-h-0 overflow-hidden">
              <InboxListPane
                isLight={isLight}
                loading={loading}
                messages={inboxMessages}
                globalFilter={inboxFilterQuery}
                selectedMessageId={selectedMessageId}
                selectedRowRef={selectedRowRef}
                onSelectMessage={(rowId) => {
                  const row = inboxMessages.find((message) => message.id === rowId);
                  if (!row) {
                    return;
                  }

                  setSelectedMessageId(row.id);
                  void fetchMessageDetail({
                    messageId: row.messageId,
                    accountEmail: row.accountEmail,
                    rowId: row.id,
                  });
                }}
                onOpenMessage={openMessageInNewWindow}
              />
            </ResizablePanel>
            {isPreviewOpen ? <ResizableHandle withHandle /> : null}
            {isPreviewOpen ? (
              <ResizablePanel defaultSize={36} minSize={24} className="min-h-0 overflow-hidden">
                <MessagePreviewPane
                  isLight={isLight}
                  detailLoading={detailLoading}
                  selectedMessage={selectedMessage}
                  onOpenMessage={openMessageInNewWindow}
                  onClosePreview={() => {
                    setIsPreviewOpen(false);
                  }}
                />
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </SidebarInset>

      <InboxCommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        selectedMessage={
          selectedMessage
            ? {
                messageId: selectedMessage.messageId,
                accountEmail: selectedMessage.accountEmail,
              }
            : null
        }
        onRefreshInbox={() => {
          void fetchInboxFromApi();
        }}
        onSearchInbox={(query) => {
          setInboxFilterQuery(query);
        }}
        onOpenMessage={openMessageInNewWindow}
        onSetTheme={setTheme}
      />

      <CreateInboxDialog
        open={createInboxOpen}
        onOpenChange={setCreateInboxOpen}
        senderSuggestions={senderSuggestions}
        onCreateInbox={(inbox) => {
          setCustomInboxes((current) => [inbox, ...current]);
          setActiveInboxId(inbox.id);
          toast.success(`Created inbox: ${inbox.name}`);
        }}
      />
    </SidebarProvider>
  );
}
