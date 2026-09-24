import type {
  AdminFeedbackEntry,
  EntryKind,
  EntryPriority,
  EntryStatus,
  RoadmapItem,
} from "convex-feedback";
import {
  CheckIcon,
  ChevronUp,
  CornerDownRightIcon,
  InfoIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { MetadataDialog } from "./metadata-dialog.js";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useAdminAction } from "../lib/action";
import { feedbackHooks } from "../lib/feedback";

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
const kindItems: { label: string; value: EntryKind }[] = [
  { label: "Feedback", value: "feedback" },
  { label: "Feature request", value: "feature_request" },
  { label: "Bug report", value: "bug_report" },
];

export function FeedbackSheet({
  entryId,
  onClose,
  onOpenRoadmap,
}: {
  entryId: string | null;
  onClose: () => void;
  onOpenRoadmap: (roadmapId: string, roadmapItem?: RoadmapItem) => void;
}) {
  const entry = feedbackHooks.useAdminEntry(entryId);
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();
  const action = useAdminAction();
  const [editOpen, setEditOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  return (
    <Sheet
      open={entryId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setEditOpen(false);
          setMetadataOpen(false);
          onClose();
        }
      }}
    >
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
                  #{entry.id}
                </span>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                <SheetTitle className="text-xl leading-tight">
                  {entry.title}
                </SheetTitle>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.metadata !== undefined && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMetadataOpen(true)}
                    >
                      <InfoIcon data-icon="inline-start" />
                      Show metadata
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                </div>
              </div>
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
                  <AdminEntryUpvote entry={entry} />
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
                </div>
                {entry.roadmap ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                    <Button
                      variant="link"
                      className="min-w-0 justify-start truncate px-0 font-normal"
                      onClick={() =>
                        onOpenRoadmap(entry.roadmap!.id, entry.roadmap)
                      }
                    >
                      <span className="truncate">{entry.roadmap.title}</span>
                    </Button>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">
                        {entry.roadmap.status.replaceAll("_", " ")}
                      </Badge>
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
                    </div>
                  </div>
                ) : (
                  <RoadmapSelector entryId={entry.id} />
                )}
              </section>
              <Separator />
              <Discussion
                entryId={entry.id}
                commentCount={entry.commentCount}
              />
            </div>
          </>
        )}
      </SheetContent>
      {entry && (
        <EntryEditorDialog
          key={editOpen ? entry.id : "entry-edit-closed"}
          entry={entry}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {entry && entry.metadata !== undefined && (
        <MetadataDialog
          metadata={entry.metadata}
          entryTitle={entry.title}
          open={metadataOpen}
          onOpenChange={setMetadataOpen}
        />
      )}
    </Sheet>
  );
}

function AdminEntryUpvote({ entry }: { entry: AdminFeedbackEntry }) {
  const setUpvote = feedbackHooks.useSetEntryUpvote();
  const action = useAdminAction();
  const active = entry.viewerHasUpvoted;

  return (
    <Button
      variant={active ? "default" : "secondary"}
      size="sm"
      disabled={action.pending}
      aria-pressed={active}
      aria-label={active ? "Remove entry upvote" : "Upvote entry"}
      onClick={() =>
        void action.run(
          () => setUpvote({ entryId: entry.id, desiredState: !active }),
          active ? "Upvote removed" : "Entry upvoted",
        )
      }
    >
      <ChevronUp data-icon="inline-start" />
      {active ? "Upvoted" : "Upvote"}
      <span>{entry.upvoteCount}</span>
    </Button>
  );
}

export function EntryEditorDialog({
  entry,
  open,
  onOpenChange,
  onCreated,
}: {
  entry: AdminFeedbackEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (entryId: string) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? "feedback");
  const create = feedbackHooks.useCreateEntry();
  const update = feedbackHooks.useUpdateEntry();
  const action = useAdminAction();
  const isCreate = entry === null;

  const save = async () => {
    let createdEntryId: string | undefined;
    const succeeded = await action.run(
      async () => {
        if (entry) {
          await update({ entryId: entry.id, kind, title, body });
        } else {
          createdEntryId = await create({ kind, title, body });
        }
      },
      isCreate ? "Entry created" : "Entry updated",
    );
    if (succeeded) {
      onOpenChange(false);
      if (createdEntryId) onCreated?.(createdEntryId);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !action.pending && onOpenChange(nextOpen)}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Create entry" : "Edit entry"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Capture a new customer signal for the inbox."
              : "Update the entry details, including its category."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Kind</FieldLabel>
            <Select
              items={kindItems}
              value={kind}
              disabled={action.pending}
              onValueChange={(next) => {
                if (next) setKind(next);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Change entry kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {kindItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-entry-title">Title</FieldLabel>
            <Input
              id="feedback-entry-title"
              autoFocus={isCreate}
              value={title}
              disabled={action.pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-entry-body">Description</FieldLabel>
            <Textarea
              id="feedback-entry-body"
              value={body}
              disabled={action.pending}
              onChange={(event) => setBody(event.target.value)}
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
            disabled={!title.trim() || !body.trim() || action.pending}
            onClick={() => void save()}
          >
            {action.pending && <Spinner data-icon="inline-start" />}
            {isCreate ? "Create entry" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function Discussion({
  entryId,
  commentCount,
}: {
  entryId: string;
  commentCount: number;
}) {
  const comments = feedbackHooks.useComments({ entryId, sort: "oldest" });
  const createComment = feedbackHooks.useCreateComment();
  const action = useAdminAction();
  const [body, setBody] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;
    const succeeded = await action.run(
      () => createComment({ entryId, body }),
      "Comment added",
    );
    if (succeeded) setBody("");
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Discussion</h2>
        <Badge variant="secondary">{commentCount}</Badge>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => void submit(event)}
      >
        <FieldGroup>
          <Field>
            <FieldLabel className="sr-only" htmlFor="new-comment">
              Add a comment
            </FieldLabel>
            <Textarea
              id="new-comment"
              value={body}
              disabled={action.pending}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add a comment…"
              rows={3}
            />
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || action.pending}
          >
            {action.pending && <Spinner data-icon="inline-start" />}
            Add comment
          </Button>
        </div>
      </form>
      {comments.status === "LoadingFirstPage" ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.results.length === 0 ? (
        commentCount === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-sm text-muted-foreground">
              {commentCount}{" "}
              {commentCount === 1 ? "comment is" : "comments are"} recorded, but
              no top-level messages are available.
            </p>
          </div>
        )
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

type AdminComment = ReturnType<
  typeof feedbackHooks.useComments
>["results"][number];

function AdminCommentBranch({
  entryId,
  comment,
}: {
  entryId: string;
  comment: AdminComment;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const updateComment = feedbackHooks.useUpdateComment();
  const createComment = feedbackHooks.useCreateComment();
  const editAction = useAdminAction();
  const replyAction = useAdminAction();

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editBody.trim()) return;
    const succeeded = await editAction.run(
      () => updateComment({ commentId: comment.id, body: editBody }),
      "Comment updated",
    );
    if (succeeded) setEditing(false);
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replyBody.trim()) return;
    const succeeded = await replyAction.run(
      () =>
        createComment({
          entryId,
          parentCommentId: comment.id,
          body: replyBody,
        }),
      "Reply added",
    );
    if (succeeded) {
      setReplyBody("");
      setReplying(false);
      setExpanded(true);
    }
  };

  return (
    <div className="flex gap-2 text-sm">
      <CornerDownRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {comment.actorId} ·{" "}
            {new Date(comment.creationTime).toLocaleString()}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="link"
              size="xs"
              className="h-auto px-0"
              onClick={() => {
                setEditBody(comment.body);
                setEditing((value) => !value);
              }}
            >
              Edit
            </Button>
            <Button
              variant="link"
              size="xs"
              className="h-auto px-0"
              onClick={() => setReplying((value) => !value)}
            >
              Reply
            </Button>
          </div>
        </div>
        {editing ? (
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={(event) => void saveEdit(event)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel className="sr-only" htmlFor={`edit-${comment.id}`}>
                  Edit comment
                </FieldLabel>
                <Textarea
                  id={`edit-${comment.id}`}
                  value={editBody}
                  disabled={editAction.pending}
                  onChange={(event) => setEditBody(event.target.value)}
                  rows={3}
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={editAction.pending}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!editBody.trim() || editAction.pending}
              >
                {editAction.pending && <Spinner data-icon="inline-start" />}
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
        )}
        {replying && (
          <form
            className="mt-3 flex flex-col gap-2 border-l pl-3"
            onSubmit={(event) => void submitReply(event)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel className="sr-only" htmlFor={`reply-${comment.id}`}>
                  Reply to comment
                </FieldLabel>
                <Textarea
                  id={`reply-${comment.id}`}
                  value={replyBody}
                  disabled={replyAction.pending}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write a reply…"
                  rows={2}
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={replyAction.pending}
                onClick={() => setReplying(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!replyBody.trim() || replyAction.pending}
              >
                {replyAction.pending && <Spinner data-icon="inline-start" />}
                Reply
              </Button>
            </div>
          </form>
        )}
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
