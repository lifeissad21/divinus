import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

type InboxHeaderProps = {
  isLight: boolean;
  filterQuery: string;
  onFilterQueryChange: (value: string) => void;
};

export default function InboxHeader({ isLight, filterQuery, onFilterQueryChange }: InboxHeaderProps) {
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
      <div className="relative ml-auto w-[380px]">
        <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isLight ? "text-zinc-500" : "text-zinc-400"}`} />
        <Input
          value={filterQuery}
          onChange={(event) => {
            onFilterQueryChange(event.target.value);
          }}
          placeholder='Search or use tags: from:, message:, time:'
          className={`h-8 pl-8 text-sm ${isLight ? "border-zinc-300 bg-white" : "border-zinc-700 bg-zinc-900"}`}
        />
      </div>
    </header>
  );
}