import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { type DragEvent, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { feedbackHooks } from "@/lib/feedback";
import { useAdminAction } from "@/lib/action";

const stages: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
];

export function RoadmapView() {
  const roadmap = feedbackHooks.useRoadmap();
  const items = roadmap.results;
  const move = feedbackHooks.useMoveRoadmapItem();
  const moveAction = useAdminAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const selected =
    items?.find((candidate) => candidate.id === selectedId) ?? null;

  const moveTo = async (
    item: RoadmapItem,
    status: RoadmapStatus,
    previous?: RoadmapItem,
    next?: RoadmapItem,
  ) => {
    if (moveAction.pending) return;
    await moveAction.run(
      () =>
        move({
          roadmapId: item.id,
          status,
          previousItemId: previous?.id,
          nextItemId: next?.id,
        }),
      `Moved to ${status.replaceAll("_", " ")}`,
    );
  };

  const getDraggingItem = () =>
    items?.find((candidate) => candidate.id === draggingId);

  const dropAtEnd = (
    event: DragEvent<HTMLElement>,
    status: RoadmapStatus,
    _stageItems: RoadmapItem[],
  ) => {
    event.preventDefault();
    const dragged = getDraggingItem();
    if (!dragged) return;

    void moveTo(dragged, status);
    setDraggingId(null);
  };

  const dropOnItem = (
    event: DragEvent<HTMLElement>,
    dragged: RoadmapItem,
    target: RoadmapItem,
    status: RoadmapStatus,
    stageItems: RoadmapItem[],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragged.id === target.id) {
      setDraggingId(null);
      return;
    }

    const destinationItems = stageItems.filter(
      (candidate) => candidate.id !== dragged.id,
    );
    const targetIndex = destinationItems.findIndex(
      (candidate) => candidate.id === target.id,
    );
    if (targetIndex < 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY >= bounds.top + bounds.height / 2;
    const insertIndex = targetIndex + (insertAfter ? 1 : 0);
    void moveTo(
      dragged,
      status,
      destinationItems[insertIndex - 1],
      destinationItems[insertIndex],
    );
    setDraggingId(null);
  };

  return (
    <section className="panel-enter flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            Turn recurring feedback into visible delivery work.
          </p>
        </div>
        <div className="flex gap-2">
          {(roadmap.status === "CanLoadMore" ||
            roadmap.status === "LoadingMore") && (
            <Button
              variant="outline"
              disabled={roadmap.status === "LoadingMore"}
              onClick={() => roadmap.loadMore(feedbackHooks.pageSizes.roadmap)}
            >
              {roadmap.status === "LoadingMore" && (
                <Spinner data-icon="inline-start" />
              )}
              Load more
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New item
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-px overflow-x-auto bg-border lg:grid-cols-3">
        {stages.map((stage) => {
          const stageItems = (items ?? [])
            .filter((item) => item.status === stage.value)
            .sort((a, b) => a.position - b.position);
          return (
            <section
              key={stage.value}
              className="min-w-80 bg-background"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropAtEnd(event, stage.value, stageItems)}
            >
              <div className="sticky top-0 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
                <h2 className="text-sm font-medium">{stage.label}</h2>
                <Badge variant="secondary">{stageItems.length}</Badge>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {roadmap.status === "LoadingFirstPage" ? (
                  [0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-28 w-full" />
                  ))
                ) : stageItems.length === 0 ? (
                  <Empty className="min-h-40">
                    <EmptyHeader>
                      <EmptyTitle>No items</EmptyTitle>
                      <EmptyDescription>
                        Drag an item here or create one.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  stageItems.map((item) => (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(item.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        const dragged = getDraggingItem();
                        if (dragged) {
                          dropOnItem(
                            event,
                            dragged,
                            item,
                            stage.value,
                            stageItems,
                          );
                        }
                      }}
                      className="group rounded-xl border bg-card p-3 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="flex items-start gap-2">
                          <GripVerticalIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium leading-5">
                            {item.title}
                          </span>
                        </span>
                        {item.description && (
                          <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                        <span className="mt-3 block text-xs text-muted-foreground">
                          {item.feedbackCount} linked{" "}
                          {item.feedbackCount === 1 ? "entry" : "entries"}
                        </span>
                      </button>
                      <div className="mt-3 flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                        {stage.value !== "planned" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move to previous stage"
                            disabled={moveAction.pending}
                            onClick={() =>
                              void moveTo(
                                item,
                                stages[
                                  stages.findIndex(
                                    (value) => value.value === stage.value,
                                  ) - 1
                                ]!.value,
                              )
                            }
                          >
                            <ArrowLeftIcon />
                          </Button>
                        )}
                        {stage.value !== "shipped" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move to next stage"
                            disabled={moveAction.pending}
                            onClick={() =>
                              void moveTo(
                                item,
                                stages[
                                  stages.findIndex(
                                    (value) => value.value === stage.value,
                                  ) + 1
                                ]!.value,
                              )
                            }
                          >
                            <ArrowRightIcon />
                          </Button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      <RoadmapEditor
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <RoadmapDetail
        item={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </section>
  );
}

function RoadmapEditor({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RoadmapItem;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const create = feedbackHooks.useCreateRoadmap();
  const update = feedbackHooks.useUpdateRoadmap();
  const action = useAdminAction();

  const save = async () => {
    const succeeded = await action.run(
      () =>
        item
          ? update({
              roadmapId: item.id,
              title,
              description: description || undefined,
            })
          : create({
              title,
              description: description || undefined,
              status: "planned",
            }),
      item ? "Roadmap item updated" : "Roadmap item created",
    );
    if (succeeded) {
      onOpenChange(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !action.pending && onOpenChange(nextOpen)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit roadmap item" : "Create roadmap item"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update the delivery context."
              : "New items begin in Planned."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="item-title">Title</FieldLabel>
            <Input
              id="item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="item-description">Description</FieldLabel>
            <Textarea
              id="item-description"
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
            onClick={() => void save()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoadmapDetail({
  item,
  onOpenChange,
}: {
  item: RoadmapItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const feedback = feedbackHooks.useRoadmapFeedback(item?.id);
  const detach = feedbackHooks.useDetachFeedbackFromRoadmap();
  const remove = feedbackHooks.useDeleteRoadmap();
  const detachAction = useAdminAction();
  const deleteAction = useAdminAction();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!item) return null;

  const deleteItem = async () => {
    const succeeded = await deleteAction.run(
      () => remove({ roadmapId: item.id }),
      "Roadmap item deleted",
    );
    if (succeeded) {
      setDeleteOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(nextOpen) =>
          !detachAction.pending &&
          !deleteAction.pending &&
          onOpenChange(nextOpen)
        }
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>
              {item.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">
              {item.status.replaceAll("_", " ")}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={detachAction.pending || deleteAction.pending}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                disabled={detachAction.pending || deleteAction.pending}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </div>
          </div>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            <h3 className="mb-1 text-sm font-medium">Attached feedback</h3>
            {feedback.results.length === 0 &&
              feedback.status === "Exhausted" && (
                <p className="text-sm text-muted-foreground">
                  No feedback attached.
                </p>
              )}
            {feedback.results.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="truncate">{entry.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={detachAction.pending}
                  onClick={() =>
                    void detachAction.run(
                      () => detach({ entryId: entry.id }),
                      "Feedback detached",
                    )
                  }
                >
                  Detach
                </Button>
              </div>
            ))}
            {(feedback.status === "CanLoadMore" ||
              feedback.status === "LoadingMore") && (
              <Button
                variant="outline"
                disabled={feedback.status === "LoadingMore"}
                onClick={() =>
                  feedback.loadMore(feedbackHooks.pageSizes.entries)
                }
              >
                {feedback.status === "LoadingMore" && (
                  <Spinner data-icon="inline-start" />
                )}
                Load more feedback
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => !deleteAction.pending && setDeleteOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete roadmap item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the roadmap item and detaches all linked
              feedback. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAction.pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteAction.pending}
              onClick={() => void deleteItem()}
            >
              {deleteAction.pending && <Spinner data-icon="inline-start" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RoadmapEditor
        key={editOpen ? item.id : "edit-closed"}
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
      />
    </>
  );
}
