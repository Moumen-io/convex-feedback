import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { feedbackHooks } from "@/lib/feedback";

const stages: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
];

export function RoadmapView() {
  const items = feedbackHooks.useRoadmap();
  const move = feedbackHooks.useMoveRoadmapItem();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<RoadmapItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const moveTo = async (item: RoadmapItem, status: RoadmapStatus) => {
    try {
      await move({ roadmapId: item.id, status });
      toast.success(`Moved to ${status.replaceAll("_", " ")}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to move item",
      );
    }
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
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New item
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 gap-px overflow-x-auto bg-border lg:grid-cols-3">
        {stages.map((stage) => {
          const stageItems = items
            ?.filter((item) => item.status === stage.value)
            .sort((a, b) => a.position - b.position);
          return (
            <section
              key={stage.value}
              className="min-w-80 bg-background"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const item = items?.find(
                  (candidate) => candidate.id === draggingId,
                );
                if (item) void moveTo(item, stage.value);
                setDraggingId(null);
              }}
            >
              <div className="sticky top-0 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
                <h2 className="text-sm font-medium">{stage.label}</h2>
                <Badge variant="secondary">{stageItems?.length ?? 0}</Badge>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {items === undefined ? (
                  [0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-28 w-full" />
                  ))
                ) : stageItems?.length === 0 ? (
                  <Empty className="min-h-40">
                    <EmptyHeader>
                      <EmptyTitle>No items</EmptyTitle>
                      <EmptyDescription>
                        Drag an item here or create one.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  stageItems?.map((item) => (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggingId(item.id)}
                      className="group rounded-xl border bg-card p-3 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelected(item)}
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
      <RoadmapEditor open={createOpen} onOpenChange={setCreateOpen} />
      <RoadmapDetail
        item={selected}
        onOpenChange={(open) => !open && setSelected(null)}
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
  const save = async () => {
    try {
      if (item)
        await update({
          roadmapId: item.id,
          title,
          description: description || undefined,
        });
      else
        await create({
          title,
          description: description || undefined,
          status: "planned",
        });
      toast.success(item ? "Roadmap item updated" : "Roadmap item created");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!title.trim()} onClick={() => void save()}>
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
  const [editOpen, setEditOpen] = useState(false);
  if (!item) return null;
  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
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
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  void remove({ roadmapId: item.id }).then(() => {
                    toast.success("Roadmap item deleted");
                    onOpenChange(false);
                  })
                }
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </div>
          </div>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            <h3 className="mb-1 text-sm font-medium">Attached feedback</h3>
            {feedback?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No feedback attached.
              </p>
            )}
            {feedback?.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="truncate">{entry.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void detach({ entryId: entry.id })}
                >
                  Detach
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <RoadmapEditor open={editOpen} onOpenChange={setEditOpen} item={item} />
    </>
  );
}
