import type { FeedbackMetadata, FeedbackMetadataValue } from "convex-feedback";
import { Code2Icon, DatabaseIcon, InfoIcon, MonitorIcon } from "lucide-react";

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

function formatMetadataKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return words.length === 0
    ? key
    : words.charAt(0).toLocaleUpperCase("en-US") + words.slice(1);
}

function formatMetadataValue(value: FeedbackMetadataValue): string {
  return typeof value === "string" ? value : String(value);
}

function metadataValueType(value: FeedbackMetadataValue): string {
  return typeof value === "number" ? "number" : typeof value;
}

export function MetadataDialog({
  metadata,
  entryTitle,
  open,
  onOpenChange,
}: {
  metadata: FeedbackMetadata;
  entryTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sections = [
    {
      key: "standard",
      label: "Standard diagnostics",
      description: "Platform and device context collected by the feedback UI.",
      Icon: MonitorIcon,
      values: metadata.standard,
    },
    {
      key: "additional",
      label: "Additional context",
      description: "Application-provided values attached at submission time.",
      Icon: Code2Icon,
      values: metadata.additional,
    },
  ] as const;
  const populatedSections = sections.filter(
    (section) =>
      section.values !== undefined && Object.keys(section.values).length > 0,
  );
  const valueCount = populatedSections.reduce(
    (count, section) => count + Object.keys(section.values ?? {}).length,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] !gap-0 !p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="border-b bg-muted/20 px-6 py-5 pr-12">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DatabaseIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle>Diagnostic metadata</DialogTitle>
              <DialogDescription className="line-clamp-2">
                Context captured with “{entryTitle}”.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
            <InfoIcon
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Submission snapshot</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                These values are read-only and help explain the environment in
                which this entry was created.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {valueCount} {valueCount === 1 ? "value" : "values"}
            </Badge>
          </div>

          {populatedSections.length > 0 ? (
            <div className="grid gap-4">
              {populatedSections.map(
                ({ key, label, description, Icon, values }) => (
                  <section
                    key={key}
                    className="overflow-hidden rounded-xl border bg-card shadow-xs"
                  >
                    <div className="flex items-start gap-3 border-b bg-muted/20 px-4 py-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium">{label}</h3>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {Object.keys(values ?? {}).length}
                      </Badge>
                    </div>
                    <dl>
                      {Object.entries(values ?? {}).map(([key, value]) => (
                        <div
                          key={key}
                          className="grid gap-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(9rem,0.75fr)_minmax(0,1.25fr)] sm:items-start sm:gap-4"
                        >
                          <dt className="text-xs font-medium text-muted-foreground">
                            {formatMetadataKey(key)}
                          </dt>
                          <dd className="min-w-0 break-words font-mono text-xs leading-5 text-foreground">
                            <span>{formatMetadataValue(value)}</span>{" "}
                            <Badge
                              variant="secondary"
                              className="ml-1 align-middle font-sans text-[10px] uppercase tracking-wide"
                            >
                              {metadataValueType(value)}
                            </Badge>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ),
              )}
            </div>
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed px-6 py-12 text-center">
              <InfoIcon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium">No metadata values</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                This entry does not contain any diagnostic values.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="!mx-0 !mb-0 rounded-b-xl border-t bg-muted/20 !px-6 !py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
