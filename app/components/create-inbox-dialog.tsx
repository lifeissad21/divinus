import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CustomInbox, InboxFilterLogic } from "@/lib/customInboxes";
import { createCustomInboxId } from "@/lib/customInboxes";

type CreateInboxDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderSuggestions: string[];
  onCreateInbox: (inbox: CustomInbox) => void;
};

function normalizeAndDedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function FilterPills({
  items,
  onRemove,
}: {
  items: string[];
  onRemove: (value: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
          {item}
          <button
            type="button"
            onClick={() => {
              onRemove(item);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${item}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function CreateInboxDialog({
  open,
  onOpenChange,
  senderSuggestions,
  onCreateInbox,
}: CreateInboxDialogProps) {
  const [name, setName] = useState("");
  const [pinned, setPinned] = useState(true);
  const [logic, setLogic] = useState<InboxFilterLogic>("AND");

  const [senderInput, setSenderInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const [senders, setSenders] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && (senders.length > 0 || topics.length > 0 || keywords.length > 0);
  }, [keywords.length, name, senders.length, topics.length]);

  const resetState = () => {
    setName("");
    setPinned(true);
    setLogic("AND");
    setSenderInput("");
    setTopicInput("");
    setKeywordInput("");
    setSenders([]);
    setTopics([]);
    setKeywords([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Inbox</DialogTitle>
          <DialogDescription>
            Define filters for a custom inbox. Messages matching these rules will appear in this inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-inbox-name">Inbox name</Label>
            <Input
              id="new-inbox-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Product Updates"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Pin this inbox</p>
              <p className="text-xs text-muted-foreground">Pinned inboxes appear in the header tabs and sidebar.</p>
            </div>
            <Switch checked={pinned} onCheckedChange={setPinned} />
          </div>

          <div className="space-y-2">
            <Label>Filter logic</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={logic === "AND" ? "default" : "outline"}
                onClick={() => {
                  setLogic("AND");
                }}
              >
                AND
              </Button>
              <Button
                type="button"
                variant={logic === "OR" ? "default" : "outline"}
                onClick={() => {
                  setLogic("OR");
                }}
              >
                OR
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="sender-filter">Sender</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="sender-filter"
                  value={senderInput}
                  onChange={(event) => {
                    setSenderInput(event.target.value);
                  }}
                  list="sender-suggestions"
                  placeholder="e.g. GitHub"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSenders((current) => normalizeAndDedupe([...current, senderInput]));
                    setSenderInput("");
                  }}
                  disabled={!senderInput.trim()}
                >
                  Add
                </Button>
              </div>
              <datalist id="sender-suggestions">
                {senderSuggestions.map((sender) => (
                  <option key={sender} value={sender} />
                ))}
              </datalist>
              <FilterPills
                items={senders}
                onRemove={(value) => {
                  setSenders((current) => current.filter((item) => item !== value));
                }}
              />
            </div>

            <div>
              <Label htmlFor="topic-filter">Topic (subject)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="topic-filter"
                  value={topicInput}
                  onChange={(event) => {
                    setTopicInput(event.target.value);
                  }}
                  placeholder="e.g. billing"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTopics((current) => normalizeAndDedupe([...current, topicInput]));
                    setTopicInput("");
                  }}
                  disabled={!topicInput.trim()}
                >
                  Add
                </Button>
              </div>
              <FilterPills
                items={topics}
                onRemove={(value) => {
                  setTopics((current) => current.filter((item) => item !== value));
                }}
              />
            </div>

            <div>
              <Label htmlFor="keyword-filter">Mentioned word</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="keyword-filter"
                  value={keywordInput}
                  onChange={(event) => {
                    setKeywordInput(event.target.value);
                  }}
                  placeholder="e.g. launch"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setKeywords((current) => normalizeAndDedupe([...current, keywordInput]));
                    setKeywordInput("");
                  }}
                  disabled={!keywordInput.trim()}
                >
                  Add
                </Button>
              </div>
              <FilterPills
                items={keywords}
                onRemove={(value) => {
                  setKeywords((current) => current.filter((item) => item !== value));
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              const inbox: CustomInbox = {
                id: createCustomInboxId(name),
                name: name.trim(),
                pinned,
                logic,
                filters: {
                  senders,
                  topics,
                  keywords,
                },
                createdAt: new Date().toISOString(),
              };

              onCreateInbox(inbox);
              onOpenChange(false);
              resetState();
            }}
          >
            Create inbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
