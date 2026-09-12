import type { FeedbackTag } from "convex-feedback";
import { PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackHooks } from "@/lib/feedback";
import { useTags } from "@/providers/tags-provider";

export function TagsView() {
  const tags = useTags();
  const create = feedbackHooks.useCreateTag();
  const update = feedbackHooks.useUpdateTag();
  const remove = feedbackHooks.useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#39745B");
  const add = async () => {
    try {
      await create({ name, color });
      setName("");
      toast.success("Tag created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create tag",
      );
    }
  };
  return (
    <section className="panel-enter flex min-h-0 flex-1 flex-col">
      <header className="border-b px-5 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Keep internal feedback taxonomy small and useful.
        </p>
      </header>
      <div className="grid flex-1 gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-1">
          {tags === undefined ? (
            [0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))
          ) : tags.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TagIcon />
                </EmptyMedia>
                <EmptyTitle>No tags yet</EmptyTitle>
                <EmptyDescription>
                  Create a tag to begin organizing feedback.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onSave={(nextName, nextColor) =>
                  update({ tagId: tag.id, name: nextName, color: nextColor })
                }
                onDelete={() => remove({ tagId: tag.id })}
              />
            ))
          )}
        </div>
        <aside className="h-fit rounded-xl border bg-card p-4">
          <h2 className="text-sm font-medium">Create tag</h2>
          <FieldGroup className="mt-4">
            <Field>
              <FieldLabel htmlFor="tag-name">Name</FieldLabel>
              <Input
                id="tag-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Enterprise"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tag-color">Color</FieldLabel>
              <Input
                id="tag-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button
            className="mt-4 w-full"
            disabled={!name.trim()}
            onClick={() => void add()}
          >
            <PlusIcon data-icon="inline-start" />
            Create tag
          </Button>
        </aside>
      </div>
    </section>
  );
}

function TagRow({
  tag,
  onSave,
  onDelete,
}: {
  tag: FeedbackTag;
  onSave: (name: string, color?: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [name, setName] = useState(tag.name);
  return (
    <div className="flex items-center gap-3 border-b py-3">
      <span
        className="size-3 rounded-full border"
        style={{ backgroundColor: tag.color }}
      />
      <Input
        aria-label={`Name for ${tag.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Badge variant="outline">{tag.color ?? "No color"}</Badge>
      <Button
        variant="ghost"
        size="sm"
        disabled={name.trim() === tag.name}
        onClick={() =>
          void onSave(name, tag.color).then(() => toast.success("Tag updated"))
        }
      >
        Save
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${tag.name}`}
        onClick={() =>
          void onDelete().then(() => toast.success("Tag deleted and detached"))
        }
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
