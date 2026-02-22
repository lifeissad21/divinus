import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MessageBody from "./MessageBody";
import type { MessageDetail } from "./inbox-types";

type MessagePreviewPaneProps = {
  isLight: boolean;
  detailLoading: boolean;
  selectedMessage: MessageDetail | null;
  onOpenMessage: (params: { messageId: string; accountEmail: string }) => void;
  onClosePreview: () => void;
};

export default function MessagePreviewPane({
  isLight,
  detailLoading,
  selectedMessage,
  onOpenMessage,
  onClosePreview,
}: MessagePreviewPaneProps) {
  return (
    <div
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClosePreview();
        }
      }}
      className={`flex h-full min-h-0 flex-col overflow-hidden focus:outline-none ${isLight ? "bg-white" : "bg-zinc-950"}`}
    >
      {detailLoading ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className={`shrink-0 border-b px-6 py-4 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-6 w-36 rounded-md" />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 px-6 py-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-9/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        </div>
      ) : selectedMessage ? (
        <>
          <div className={`shrink-0 border-b px-6 py-4 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={`text-lg font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>{selectedMessage.subject}</h2>
              <button
                onClick={onClosePreview}
                aria-label="Close preview pane"
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${isLight ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={`mt-1 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>{selectedMessage.from}</p>
            <div className="mt-2 flex items-center gap-4">
              <p className="text-xs text-muted-foreground">{selectedMessage.date}</p>
              <button
                onClick={() => {
                  onOpenMessage({
                    messageId: selectedMessage.messageId,
                    accountEmail: selectedMessage.accountEmail,
                  });
                }}
                className={`rounded border px-2 py-0.5 text-xs ${isLight ? "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900" : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"}`}
              >
                Open in new window ↗
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <MessageBody bodyHtml={selectedMessage.bodyHtml} bodyText={selectedMessage.bodyText || selectedMessage.body} />
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className={`shrink-0 border-b px-6 py-4 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-6 w-36 rounded-md" />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 px-6 py-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-9/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        </div>
      )}
    </div>
  );
}