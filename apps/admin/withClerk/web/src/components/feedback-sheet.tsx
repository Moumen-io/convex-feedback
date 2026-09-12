import type { EntryPriority, EntryStatus } from "convex-feedback";
import {
  CheckIcon,
  CornerDownRightIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useState } from "react";

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
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";

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

export function FeedbackSheet({
  entryId,
  onClose,
}: {
  entryId: string | null;
  onClose: () => void;
}) {
  const entry = feedbackHooks.useAdminEntry(entryId);
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();
  const action = useAdminAction();

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
                    disabled={action.pending}
                    onValueChange={(status) => {
                      void action.run(
                        () =>
                          setStatus({
                            entryId: entry.id,
                            status: status as EntryStatus,
                          }),
                        "Status updated",
                      );
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <AdminSelect
                    items={priorityItems}
                    value={entry.priority ?? "none"}
                    disabled={action.pending}
                    onValueChange={(priority) => {
                      void action.run(
                        () =>
                          setPriority({
                            entryId: entry.id,
                            priority:
                              priority === "none"
                                ? null
                                : (priority as EntryPriority),
                          }),
                        "Priority updated",
                      );
                    }}
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
                      disabled={action.pending}
                      onClick={() =>
                        void action.run(
                          () => detachRoadmap({ entryId: entry.id }),
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
  disabled,
}: {
  items: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
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

function RoadmapSelector({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const results = feedbackHooks.useSearchRoadmap(debounced);
  const attach = feedbackHooks.useAttachFeedbackToRoadmap();
  const action = useAdminAction();

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="justify-start"
              disabled={action.pending}
            />
          }
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
                    disabled={action.pending}
                    onSelect={() => {
                      setOpen(false);
                      void action.run(
                        () => attach({ entryId, roadmapId: item.id }),
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
                disabled={action.pending}
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
  const createForEntry = feedbackHooks.useCreateRoadmapForEntry();
  const action = useAdminAction();
  const submit = async () => {
    const succeeded = await action.run(async () => {
      await createForEntry({
        entryId,
        title,
        description: description || undefined,
        status: "planned",
      });
    }, "Roadmap item created and attached");
    if (succeeded) {
      onOpenChange(false);
      setTitle("");
      setDescription("");
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !action.pending && onOpenChange(nextOpen)}
    >
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
              disabled={action.pending}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="roadmap-description">Description</FieldLabel>
            <Textarea
              id="roadmap-description"
              disabled={action.pending}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={action.pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || action.pending}
            onClick={() => void submit()}
          >
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
      {comments.status === "LoadingFirstPage" ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        comments.results.map((comment) => (
          <AdminCommentBranch
            key={comment.id}
            entryId={entryId}
            comment={comment}
          />
        ))
      )}
      {(comments.status === "CanLoadMore" ||
        comments.status === "LoadingMore") && (
        <Button
          variant="outline"
          disabled={comments.status === "LoadingMore"}
          onClick={() => comments.loadMore(feedbackHooks.pageSizes.comments)}
        >
          Load more comments
        </Button>
      )}
    </section>
  );
}

function AdminCommentBranch({
  entryId,
  comment,
}: {
  entryId: string;
  comment: ReturnType<typeof feedbackHooks.useComments>["results"][number];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex gap-2 text-sm">
      <CornerDownRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{comment.actorId}</p>
        <p className="mt-1 whitespace-pre-wrap">
          {comment.body ?? "Comment deleted"}
        </p>
        {comment.replyCount > 0 && (
          <>
            <Button
              variant="link"
              size="sm"
              className="mt-1 px-0"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? "Hide replies"
                : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
            </Button>
            {expanded && (
              <AdminReplyList entryId={entryId} parentCommentId={comment.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminReplyList({
  entryId,
  parentCommentId,
}: {
  entryId: string;
  parentCommentId: string;
}) {
  const replies = feedbackHooks.useComments({
    entryId,
    parentCommentId,
    sort: "oldest",
  });
  return (
    <div className="mt-2 flex flex-col gap-3 border-l pl-3">
      {replies.status === "LoadingFirstPage" ? (
        <p className="text-xs text-muted-foreground">Loading replies…</p>
      ) : (
        replies.results.map((reply) => (
          <AdminCommentBranch
            key={reply.id}
            entryId={entryId}
            comment={reply}
          />
        ))
      )}
      {(replies.status === "CanLoadMore" ||
        replies.status === "LoadingMore") && (
        <Button
          variant="outline"
          size="sm"
          disabled={replies.status === "LoadingMore"}
          onClick={() => replies.loadMore(feedbackHooks.pageSizes.replies)}
        >
          Load more replies
        </Button>
      )}
    </div>
  );
}
