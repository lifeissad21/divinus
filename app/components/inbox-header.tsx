import { SlidersHorizontal } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

type InboxHeaderProps = {
  isLight: boolean;
  threadsTotal?: number;
};

export default function InboxHeader({ isLight, threadsTotal }: InboxHeaderProps) {
  return (
    <header className={`sticky top-0 z-10 flex h-14 items-center gap-2 px-4 ${isLight ? "bg-[#f6f7f9]" : "bg-[#0f1115]"}`}>
      <SidebarTrigger className={isLight ? "text-zinc-600" : "text-zinc-300"} />
      <div className="ml-1 flex items-center gap-2">
        <button className={`rounded-md px-3 py-1.5 text-sm font-medium ${isLight ? "bg-zinc-200 text-zinc-900" : "bg-zinc-700 text-zinc-100"}`}>
          Important
        </button>
        <button className={`rounded-md px-2.5 py-1.5 text-sm ${isLight ? "text-zinc-500 hover:bg-zinc-200/60" : "text-zinc-400 hover:bg-zinc-800"}`}>
          Other
        </button>
      </div>
      <button className={`ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md ${isLight ? "text-zinc-500 hover:bg-zinc-200/60" : "text-zinc-400 hover:bg-zinc-800"}`}>
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      <div className="ml-auto text-xs text-muted-foreground">{typeof threadsTotal === "number" ? `${threadsTotal} threads` : "Authorize to load"}</div>
    </header>
  );
}