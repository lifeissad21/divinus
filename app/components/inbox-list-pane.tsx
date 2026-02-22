import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import type { FilterFn } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { Paperclip } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import type { InboxMessage } from "./inbox-types";

const DAY_MS = 24 * 60 * 60 * 1000;

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const weekdayMonthDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatInboxDate(dateValue: string): string {
  const timestamp = Date.parse(dateValue);
  if (!Number.isFinite(timestamp)) {
    return dateValue;
  }

  const date = new Date(timestamp);
  const diff = Math.max(0, Date.now() - timestamp);

  if (diff < DAY_MS) {
    return timeFormatter.format(date);
  }

  if (diff < DAY_MS * 7) {
    return weekdayMonthDayFormatter.format(date);
  }

  return monthDayFormatter.format(date);
}

function truncateByChars(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

function tokenizeQuery(query: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(query)) !== null) {
    const token = (match[1] ?? match[2] ?? "").trim();
    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
}

type ParsedFilters = {
  from: string[];
  message: string[];
  time: string[];
  general: string[];
};

function parseFilterQuery(query: string): ParsedFilters {
  return tokenizeQuery(query).reduce<ParsedFilters>(
    (parsed, token) => {
      const separator = token.indexOf(":");
      if (separator > 0) {
        const key = token.slice(0, separator).toLowerCase();
        const value = token.slice(separator + 1).trim().toLowerCase();

        if (!value) {
          return parsed;
        }

        if (key === "from") {
          parsed.from.push(value);
          return parsed;
        }

        if (key === "message") {
          parsed.message.push(value);
          return parsed;
        }

        if (key === "time") {
          parsed.time.push(value);
          return parsed;
        }
      }

      parsed.general.push(token.toLowerCase());
      return parsed;
    },
    { from: [], message: [], time: [], general: [] }
  );
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function matchTimeTag(term: string, timestamp: number): boolean {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diff = Math.max(0, now.getTime() - timestamp);
  const lowered = term.toLowerCase();

  if (lowered === "today") {
    return isSameLocalDay(now, messageDate);
  }

  if (lowered === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameLocalDay(yesterday, messageDate);
  }

  if (lowered === "24h" || lowered === "last24h" || lowered === "day") {
    return diff < DAY_MS;
  }

  if (lowered === "7d" || lowered === "last7d" || lowered === "week" || lowered === "last7days") {
    return diff < DAY_MS * 7;
  }

  const formattedDay = weekdayMonthDayFormatter.format(messageDate).toLowerCase();
  const formattedDate = monthDayFormatter.format(messageDate).toLowerCase();
  return formattedDay.includes(lowered) || formattedDate.includes(lowered);
}

type InboxListPaneProps = {
  isLight: boolean;
  loading: boolean;
  messages: InboxMessage[];
  globalFilter: string;
  selectedMessageId: string | null;
  selectedRowRef: MutableRefObject<HTMLElement | null>;
  onSelectMessage: (messageId: string) => void;
  onOpenMessage: (params: { messageId: string; accountEmail: string }) => void;
  onMessageInViewport?: (message: InboxMessage) => void;
};

export default function InboxListPane({
  isLight,
  loading,
  messages,
  globalFilter,
  selectedMessageId,
  selectedRowRef,
  onSelectMessage,
  onOpenMessage,
  onMessageInViewport,
}: InboxListPaneProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedMessageIdsRef = useRef<Set<string>>(new Set());

  const messagesById = useMemo(() => {
    return new Map(messages.map((message) => [message.id, message]));
  }, [messages]);

  useEffect(() => {
    observedMessageIdsRef.current.clear();
  }, [messages]);

  useEffect(() => {
    if (!onMessageInViewport || !scrollContainerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const rowElement = entry.target as HTMLElement;
          const messageId = rowElement.dataset.messageId;
          if (!messageId || observedMessageIdsRef.current.has(messageId)) {
            continue;
          }

          const message = messagesById.get(messageId);
          if (message) {
            observedMessageIdsRef.current.add(messageId);
            onMessageInViewport(message);
            observer.unobserve(rowElement);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "120px 0px",
        threshold: 0.1,
      }
    );

    observerRef.current = observer;
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [messagesById, onMessageInViewport]);

  const globalFilterFn = useCallback<FilterFn<InboxMessage>>((row, _columnId, filterValue) => {
    const query = typeof filterValue === "string" ? filterValue.trim() : "";
    if (!query) {
      return true;
    }

    const parsed = parseFilterQuery(query);
    const original = row.original;
    const sender = (original.from.split("<")[0]?.trim() ?? original.from).toLowerCase();
    const messageContent = `${original.subject || ""} ${original.preview || ""}`.toLowerCase();
    const parsedTime = Date.parse(original.date);
    const formattedDate = formatInboxDate(original.date).toLowerCase();
    const allText = `${sender} ${messageContent} ${formattedDate}`;

    const matchesFrom = parsed.from.every((term) => sender.includes(term));
    if (!matchesFrom) {
      return false;
    }

    const matchesMessage = parsed.message.every((term) => messageContent.includes(term));
    if (!matchesMessage) {
      return false;
    }

    const matchesGeneral = parsed.general.every((term) => allText.includes(term));
    if (!matchesGeneral) {
      return false;
    }

    if (parsed.time.length > 0) {
      if (!Number.isFinite(parsedTime)) {
        return false;
      }
      return parsed.time.every((term) => matchTimeTag(term, parsedTime));
    }

    return true;
  }, []);

  const columns = useMemo<ColumnDef<InboxMessage>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all rows"
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <Checkbox
              aria-label="Select row"
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value);
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </div>
        ),
        enableGlobalFilter: false,
      },
      {
        id: "sender",
        accessorFn: (row) => row.from.split("<")[0]?.trim() ?? row.from,
        header: "From",
        cell: ({ row }) => {
          const sender = row.original.from.split("<")[0]?.trim() ?? row.original.from;
          const compactSender = truncateByChars(sender, 18);
          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"}`} />
              <p className={`truncate font-medium ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>{compactSender}</p>
            </div>
          );
        },
      },
      {
        id: "content",
        accessorFn: (row) => `${row.subject || ""} ${row.preview || ""}`,
        header: "Message",
        cell: ({ row }) => {
          const message = row.original;
          const previewText = message.preview || "(empty body)";
          const compactPreview = previewText.length > 24 ? `${previewText.slice(0, 24)}…` : previewText;
          return (
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <p className={`min-w-0 truncate font-semibold ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>
                {message.subject || "(No subject)"}
              </p>
              <p className="max-w-[110px] shrink-0 truncate text-sm text-muted-foreground">{compactPreview}</p>
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          );
        },
      },
      {
        id: "date",
        accessorFn: (row) => formatInboxDate(row.date),
        header: "Date",
        cell: ({ row }) => <p className="truncate text-right text-sm text-muted-foreground">{formatInboxDate(row.original.date)}</p>,
      },
    ],
    [isLight]
  );

  const table = useReactTable({
    data: messages,
    columns,
    globalFilterFn,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
      rowSelection,
    },
  });

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${isLight ? "bg-[#f6f7f9]" : "bg-[#0f1115]"}`}>
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-0.5">
        {loading ? (
          <div className="space-y-1 py-1">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className={`grid grid-cols-[minmax(170px,240px)_minmax(320px,1fr)_72px] items-center gap-2 rounded-md px-4 py-2.5 ${isLight ? "bg-zinc-100/70" : "bg-zinc-900/50"}`}>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No messages loaded.</div>
        ) : (
          <div className={`overflow-hidden rounded-md ${isLight ? "bg-white/50" : "bg-zinc-950/30"}`}>
            <Table className="table-fixed w-full">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className={isLight ? "bg-zinc-100/60" : "bg-zinc-900/50"}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`${
                          header.column.id === "select"
                            ? "w-[40px]"
                            : header.column.id === "sender"
                              ? "w-[30%]"
                              : header.column.id === "content"
                                ? "w-[52%]"
                                : "w-[18%] text-right"
                        } ${isLight ? "text-zinc-600" : "text-zinc-400"}`}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => {
                  const message = row.original;
                  const isSelected = selectedMessageId === message.id;
                  return (
                    <TableRow
                      key={row.id}
                      ref={(el) => {
                        if (isSelected) {
                          selectedRowRef.current = el;
                        }

                        if (el && observerRef.current && onMessageInViewport) {
                          el.dataset.messageId = message.id;
                          observerRef.current.observe(el);
                        }
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
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={`cursor-pointer border-b-0 ${
                        isLight ? "text-zinc-700 hover:bg-zinc-200/60" : "text-zinc-300 hover:bg-zinc-800/70"
                      } ${isSelected ? (isLight ? "bg-zinc-200" : "bg-zinc-800") : ""}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={`${
                            cell.column.id === "select"
                              ? "w-[40px]"
                              : cell.column.id === "sender"
                                ? "w-[30%]"
                                : cell.column.id === "content"
                                  ? "w-[52%]"
                                  : "w-[18%] text-right"
                          } py-2`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-20 text-center text-sm text-muted-foreground">
                      No matching messages.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}