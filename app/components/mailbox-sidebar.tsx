import {
  ArchiveX,
  File,
  Inbox,
  Moon,
  Pencil,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sun,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { UiTheme } from "./inbox-types";

type MailboxSidebarProps = {
  isLight: boolean;
  accountInitial: string;
  accountName: string;
  emailAddress?: string;
  mailboxCount: number;
  onRefreshInbox: () => void;
  onSetTheme: (theme: UiTheme) => void;
  onOpenSettings: () => void;
  onAuthClick: () => void;
  onSignoutClick: () => void;
  loading: boolean;
  authorizeVisible: boolean;
  signoutVisible: boolean;
  authorizeText: string;
  statusText: string;
};

export default function MailboxSidebar({
  isLight,
  accountInitial,
  accountName,
  emailAddress,
  mailboxCount,
  onRefreshInbox,
  onSetTheme,
  onOpenSettings,
  onAuthClick,
  onSignoutClick,
  loading,
  authorizeVisible,
  signoutVisible,
  authorizeText,
  statusText,
}: MailboxSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset" className={isLight ? "border-r border-zinc-200/80 bg-[#f3f4f6]" : "border-r border-zinc-800 bg-[#0c0d10]"}>
      <SidebarHeader className="px-3 pb-2 pt-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${isLight ? "bg-zinc-300 text-zinc-700" : "bg-zinc-700 text-zinc-100"}`}>
                {accountInitial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={isLight ? "w-56 border-zinc-200 bg-white text-zinc-900 shadow-lg" : "w-56 border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl"}
            >
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{accountName}</span>
                  <span className="text-xs text-muted-foreground">{emailAddress ?? "Not signed in"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSetTheme("light")} className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetTheme("dark")} className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark mode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${isLight ? "text-zinc-600" : "text-zinc-400"}`} />
            <Pencil className={`h-4 w-4 ${isLight ? "text-zinc-600" : "text-zinc-400"}`} />
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Inbox" onClick={onRefreshInbox} className={`h-9 justify-between rounded-md px-2 ${isLight ? "bg-zinc-200/70" : "bg-zinc-800/80"}`}>
              <span className="flex items-center gap-2 text-sm">
                <Inbox className="h-4 w-4" />
                Inbox
              </span>
              <span className="text-sm font-medium opacity-90">{mailboxCount}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Starred" className="h-9 rounded-md px-2 text-sm">
              <ArchiveX className="h-4 w-4" />
              Starred
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sent" className="h-9 rounded-md px-2 text-sm">
              <Send className="h-4 w-4" />
              Sent
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Drafts" className="h-9 rounded-md px-2 text-sm">
              <File className="h-4 w-4" />
              Drafts
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Trash" className="h-9 rounded-md px-2 text-sm">
              <Trash2 className="h-4 w-4" />
              Trash
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Done" className="h-9 rounded-md px-2 text-sm">
              Done
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Spam" className="h-9 rounded-md px-2 text-sm">
              Spam
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-[13px] text-muted-foreground">Labels</span>
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {(authorizeVisible || signoutVisible) ? (
          <div className="flex flex-col gap-2">
            {authorizeVisible ? (
              <button
                id="authorize_button"
                onClick={onAuthClick}
                disabled={loading}
                className={`rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${isLight ? "bg-zinc-900 text-zinc-100" : "bg-zinc-100 text-zinc-900"}`}
              >
                {loading ? "Loading..." : authorizeText}
              </button>
            ) : null}
            {signoutVisible ? (
              <button
                id="signout_button"
                onClick={onSignoutClick}
                disabled={loading}
                className={`rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${isLight ? "border-zinc-300 text-zinc-700" : "border-zinc-700 text-zinc-200"}`}
              >
                Sign Out
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{statusText}</p>
        <p className="text-[11px] text-muted-foreground">Press ⌘K for commands</p>
        <p className={`mt-3 text-base font-medium tracking-tight ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>{accountName}</p>
      </SidebarFooter>
    </Sidebar>
  );
}