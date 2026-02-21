import MessageBody from "./MessageBody";
import type { MessageDetail } from "./inbox-types";

type MessagePreviewPaneProps = {
  isLight: boolean;
  detailLoading: boolean;
  selectedMessage: MessageDetail | null;
  onOpenMessage: (params: { messageId: string; accountEmail: string }) => void;
};

export default function MessagePreviewPane({
  isLight,
  detailLoading,
  selectedMessage,
  onOpenMessage,
}: MessagePreviewPaneProps) {
  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${isLight ? "bg-white" : "bg-zinc-950"}`}>
      {detailLoading ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading message...</p>
        </div>
      ) : selectedMessage ? (
        <>
          <div className={`shrink-0 border-b px-6 py-4 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
            <h2 className={`text-lg font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>{selectedMessage.subject}</h2>
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <MessageBody bodyHtml={selectedMessage.bodyHtml} bodyText={selectedMessage.bodyText || selectedMessage.body} />
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a message to preview it · double-click or Enter to open in new window</p>
        </div>
      )}
    </div>
  );
}