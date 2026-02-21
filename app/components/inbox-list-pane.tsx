import type { MutableRefObject } from "react";
import { Paperclip } from "lucide-react";
import type { InboxMessage } from "./inbox-types";

type InboxListPaneProps = {
  isLight: boolean;
  messages: InboxMessage[];
  selectedMessageId: string | null;
  selectedRowRef: MutableRefObject<HTMLElement | null>;
  onSelectMessage: (messageId: string) => void;
  onOpenMessage: (params: { messageId: string; accountEmail: string }) => void;
};

export default function InboxListPane({
  isLight,
  messages,
  selectedMessageId,
  selectedRowRef,
  onSelectMessage,
  onOpenMessage,
}: InboxListPaneProps) {
  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${isLight ? "bg-[#f6f7f9]" : "bg-[#0f1115]"}`}>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {messages.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No messages loaded.</p>
        ) : (
          messages.map((message) => {
            const isSelected = selectedMessageId === message.id;
            const sender = message.from.split("<")[0]?.trim() ?? message.from;
            return (
              <article
                key={message.id}
                ref={(el) => {
                  if (isSelected) selectedRowRef.current = el;
                }}
                onClick={() => {
                  onSelectMessage(message.id);
                }}
                onDoubleClick={() => {
                  onOpenMessage({
                    messageId: message.messageId,
                    accountEmail: message.accountEmail,
                  });
                }}
                className={`mb-0.5 grid cursor-pointer grid-cols-[minmax(170px,240px)_minmax(320px,1fr)_72px] items-center gap-2 rounded-md px-4 py-2.5 text-sm transition-colors ${
                  isLight ? "text-zinc-700 hover:bg-zinc-200/70" : "text-zinc-300 hover:bg-zinc-800/70"
                } ${isSelected ? (isLight ? "bg-zinc-200" : "bg-zinc-800") : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"}`} />
                  <p className={`truncate font-medium ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>
                    {sender}
                  </p>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  <p className={`truncate font-semibold ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>
                    {message.subject || "(No subject)"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{message.preview || "(empty body)"}</p>
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
                <p className="truncate text-right text-sm text-muted-foreground">{message.date}</p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}