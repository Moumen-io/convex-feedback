import type { EntryPriority, EntryStatus, FeedbackTag } from "convex-feedback";
import {
  CheckIcon,
  CornerDownRightIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { feedbackHooks } from "@/lib/feedback";
import { useTags } from "@/providers/tags-provider";

const statusItems = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
].map((value) => ({ label: value.replaceAll("_", " "), value }));
const priorityItems = [
  { label: "No priority", value: "none" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

async function notify(action: Promise<unknown>, message: string) {
  try {
    await action;
    toast.success(message);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Something went wrong",
    );
  }
}

export function FeedbackSheet({
  entryId,
  onClose,
}: {
  entryId: string | null;
  onClose: () => void;
}) {
  const entry = feedbackHooks.useAdminEntry(entryId);
  const tags = useTags();
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const attachTag = feedbackHooks.useAttachTag();
  const detachTag = feedbackHooks.useDetachTag();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();

  const toggleTag = (tag: FeedbackTag) => {
    if (!entryId || !entry) return;
    const attached = entry.tags.some((candidate) => candidate.id === tag.id);
    void notify(
      attached
        ? detachTag({ entryId, tagId: tag.id })
        : attachTag({ entryId, tagId: tag.id }),
      attached ? "Tag removed" : "Tag attached",
    );
  };

  return (
    <Sheet open={entryId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl">
        {entry === undefined || entry === null ? (
          <div className="flex flex-col gap-4 p-5">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <Badge variant="outline">
                  {entry.kind.replaceAll("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{entry.id.slice(-6)}
                </span>
              </div>
              <SheetTitle className="text-xl leading-tight">
                {entry.title}
              </SheetTitle>
              <SheetDescription>
                Submitted {new Date(entry.creationTime).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-8">
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <AdminSelect
                    items={statusItems}
                    value={entry.status}
                    onValueChange={(status) =>
                      void notify(
                        setStatus({
                          entryId: entry.id,
                          status: status as EntryStatus,
                        }),
                        "Status updated",
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <AdminSelect
                    items={priorityItems}
                    value={entry.priority ?? "none"}
                    onValueChange={(priority) =>
                      void notify(
                        setPriority({
                          entryId: entry.id,
                          priority:
                            priority === "none"
                              ? null
                              : (priority as EntryPriority),
                        }),
                        "Priority updated",
                      )
                    }
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Tags</FieldLabel>
                  <TagPicker
                    tags={tags}
                    selected={entry.tags}
                    onToggle={toggleTag}
                  />
                </Field>
              </div>
              <Separator />
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium">Customer context</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {entry.body}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUpIcon className="size-3" />
                    {entry.upvoteCount} upvotes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquareIcon className="size-3" />
                    {entry.commentCount} comments
                  </span>
                </div>
              </section>
              <Separator />
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium">Roadmap</h2>
                    <p className="text-xs text-muted-foreground">
                      Attach this signal to one deliverable.
                    </p>
                  </div>
                  {entry.roadmap && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void notify(
                          detachRoadmap({ entryId: entry.id }),
                          "Roadmap item detached",
                        )
                      }
                    >
                      Detach
                    </Button>
                  )}
                </div>
                {entry.roadmap ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                    <span>{entry.roadmap.title}</span>
                    <Badge variant="secondary">
                      {entry.roadmap.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                ) : (
                  <RoadmapSelector entryId={entry.id} />
                )}
              </section>
              <Separator />
              <Discussion entryId={entry.id} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AdminSelect({
  items,
  value,
  onValueChange,
}: {
  items: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function TagPicker({
  tags,
  selected,
  onToggle,
}: {
  tags: FeedbackTag[] | undefined;
  selected: FeedbackTag[];
  onToggle: (tag: FeedbackTag) => void;
}) {
  if (!tags || tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tags configured yet. Create tags from the Tags view.
      </p>
    );
  }

  const selectedIds = new Set(selected.map((tag) => tag.id));
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const active = selectedIds.has(tag.id);
        return (
          <Button
            key={tag.id}
            type="button"
            variant={active ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggle(tag)}
          >
            {active && <CheckIcon data-icon="inline-start" />}
            {tag.name}
          </Button>
        );
      })}
    </div>
  );
}

function RoadmapSelector({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const results = feedbackHooks.useSearchRoadmap(debounced);
  const attach = feedbackHooks.useAttachFeedbackToRoadmap();

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button variant="outline" className="justify-start" />}
        >
          <SearchIcon data-icon="inline-start" /> Search roadmap
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <InputGroup className="m-2 w-auto">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search roadmap items…"
              />
            </InputGroup>
            <CommandList>
              <CommandEmpty>
                {debounced
                  ? "No roadmap item found."
                  : "Type to search the roadmap."}
              </CommandEmpty>
              <CommandGroup>
                {(results ?? []).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      setOpen(false);
                      void notify(
                        attach({ entryId, roadmapId: item.id }),
                        "Attached to roadmap",
                      );
                    }}
                  >
                    <span className="truncate">{item.title}</span>
                    <Badge variant="secondary">
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" /> Create roadmap item
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateRoadmapDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        entryId={entryId}
      />
    </>
  );
}

function CreateRoadmapDialog({
  open,
  onOpenChange,
  entryId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const create = feedbackHooks.useCreateRoadmap();
  const attach = feedbackHooks.useAttachFeedbackToRoadmap();
  const submit = async () => {
    try {
      const roadmapId = await create({
        title,
        description: description || undefined,
        status: "planned",
      });
      if (typeof roadmapId === "string") await attach({ entryId, roadmapId });
      toast.success("Roadmap item created and attached");
      onOpenChange(false);
      setTitle("");
      setDescription("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create roadmap item",
      );
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create roadmap item</DialogTitle>
          <DialogDescription>
            Start in Planned and attach this feedback automatically.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="roadmap-title">Title</FieldLabel>
            <Input
              id="roadmap-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="roadmap-description">Description</FieldLabel>
            <Textarea
              id="roadmap-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!title.trim()} onClick={() => void submit()}>
            <CheckIcon data-icon="inline-start" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Discussion({ entryId }: { entryId: string }) {
  const comments = feedbackHooks.useComments({ entryId, sort: "oldest" });
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Discussion</h2>
      {comments.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        comments.results.map((comment) => (
          <div key={comment.id} className="flex gap-2 text-sm">
            <CornerDownRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{comment.actorId}</p>
              <p className="mt-1 whitespace-pre-wrap">
                {comment.body ?? "Comment deleted"}
              </p>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
