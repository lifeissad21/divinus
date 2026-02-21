import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { UiTheme } from "./inbox-types";

type InboxCommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMessage: { messageId: string; accountEmail: string } | null;
  onRefreshInbox: () => void;
  onOpenMessage: (params: { messageId: string; accountEmail: string }) => void;
  onSetTheme: (theme: UiTheme) => void;
};

export default function InboxCommandDialog({
  open,
  onOpenChange,
  selectedMessage,
  onRefreshInbox,
  onOpenMessage,
  onSetTheme,
}: InboxCommandDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Inbox">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onRefreshInbox();
            }}
          >
            Refresh Inbox
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              if (selectedMessage) {
                onOpenMessage(selectedMessage);
              }
            }}
          >
            Open Selected Message
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Appearance">
          <CommandItem
            onSelect={() => {
              onSetTheme("light");
              onOpenChange(false);
            }}
          >
            Light Mode
            <CommandShortcut>☀</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onSetTheme("dark");
              onOpenChange(false);
            }}
          >
            Dark Mode
            <CommandShortcut>🌙</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}