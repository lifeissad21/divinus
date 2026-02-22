import { useState } from "react";
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
  onSearchInbox: (query: string) => void;
};

export default function InboxCommandDialog({
  open,
  onOpenChange,
  selectedMessage,
  onRefreshInbox,
  onOpenMessage,
  onSetTheme,
  onSearchInbox,
}: InboxCommandDialogProps) {
  const [commandQuery, setCommandQuery] = useState("");

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setCommandQuery("");
        }
      }}
    >
      <CommandInput
        value={commandQuery}
        onValueChange={setCommandQuery}
        placeholder="Type a command or search..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Inbox">
          <CommandItem
            onSelect={() => {
              setCommandQuery("");
              onOpenChange(false);
              onRefreshInbox();
            }}
          >
            Refresh Inbox
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCommandQuery("");
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
              setCommandQuery("");
              onOpenChange(false);
            }}
          >
            Light Mode
            <CommandShortcut>☀</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onSetTheme("dark");
              setCommandQuery("");
              onOpenChange(false);
            }}
          >
            Dark Mode
            <CommandShortcut>🌙</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {commandQuery.trim().length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Search">
              <CommandItem
                value={`search inbox ${commandQuery}`}
                onSelect={() => {
                  onSearchInbox(commandQuery.trim());
                  setCommandQuery("");
                  onOpenChange(false);
                }}
              >
                Search inbox for “{commandQuery.trim()}”
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}