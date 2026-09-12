import type {
  AdminFeedbackEntry,
  EntryKind,
  EntryPriority,
  EntryStatus,
} from "convex-feedback";
import {
  BugIcon,
  ChevronRightIcon,
  InboxIcon,
  LightbulbIcon,
  MessageSquareIcon,
  SearchIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { FeedbackSheet } from "@/components/feedback-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { feedbackHooks } from "@/lib/feedback";

const kindItems = [
  { label: "All kinds", value: "all" },
  { label: "Feedback", value: "feedback" },
  { label: "Feature request", value: "feature_request" },
  { label: "Bug report", value: "bug_report" },
];
const statusItems = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "Under review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];
const priorityItems = [
  { label: "All priorities", value: "all" },
  { label: "High priority", value: "high" },
  { label: "Medium priority", value: "medium" },
  { label: "Low priority", value: "low" },
];

function KindIcon({ kind }: { kind: EntryKind }) {
  if (kind === "bug_report") return <BugIcon className="size-4" />;
  if (kind === "feature_request") return <LightbulbIcon className="size-4" />;
  return <MessageSquareIcon className="size-4" />;
}

function EntryRow({
  entry,
  onSelect,
}: {
  entry: AdminFeedbackEntry;
  onSelect: (entryId: string) => void;
}) {
  return (
    <button
      type="button"
      className="group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 border-b px-4 py-4 text-left transition-colors hover:bg-muted/60"
      onClick={() => onSelect(entry.id)}
    >
      <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <KindIcon kind={entry.kind} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{entry.title}</span>
          {entry.priority && (
            <Badge
              variant={entry.priority === "high" ? "default" : "secondary"}
            >
              {entry.priority}
            </Badge>
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {entry.body}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{entry.status.replaceAll("_", " ")}</Badge>
          <span className="inline-flex items-center gap-1">
            <ThumbsUpIcon className="size-3" /> {entry.upvoteCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquareIcon className="size-3" /> {entry.commentCount}
          </span>
        </span>
      </span>
      <ChevronRightIcon className="mt-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function InboxView() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 280);

  const filters = useMemo(
    () => ({
      ...(kind === "all" ? {} : { kinds: [kind as EntryKind] }),
      ...(status === "all" ? {} : { status: status as EntryStatus }),
      ...(priority === "all" ? {} : { priority: priority as EntryPriority }),
    }),
    [kind, priority, status],
  );
  const listed = feedbackHooks.useAdminEntries(filters);
  const searched = feedbackHooks.useAdminSearchEntries({
    searchQuery: debouncedSearch,
    ...filters,
  });
  const page = debouncedSearch.length > 0 ? searched : listed;
  const entries = page.results;
  return (
    <section className="panel-enter flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 border-b px-5 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Triage feedback and connect customer signals to the roadmap.
        </p>
      </header>
      <div className="flex flex-col gap-3 border-b bg-card/60 px-4 py-3 lg:flex-row lg:items-center">
        <InputGroup className="lg:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search feedback"
            placeholder="Search feedback…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            items={kindItems}
            value={kind}
            onValueChange={setKind}
          />
          <FilterSelect
            items={statusItems}
            value={status}
            onValueChange={setStatus}
          />
          <FilterSelect
            items={priorityItems}
            value={priority}
            onValueChange={setPriority}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-card">
        {page.status === "LoadingFirstPage" ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : entries.length === 0 && page.status === "Exhausted" ? (
          <Empty className="min-h-80">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>No feedback found</EmptyTitle>
              <EmptyDescription>
                Try removing a filter or changing your search.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onSelect={setSelectedId} />
            ))}
            {(page.status === "CanLoadMore" ||
              page.status === "LoadingMore") && (
              <div className="flex justify-center p-4">
                <Button
                  variant="outline"
                  disabled={page.status === "LoadingMore"}
                  onClick={() => page.loadMore(feedbackHooks.pageSizes.entries)}
                >
                  {page.status === "LoadingMore" && (
                    <Spinner data-icon="inline-start" />
                  )}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <FeedbackSheet entryId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  );
}

function FilterSelect({
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
      onValueChange={(next) => onValueChange(next ?? "all")}
    >
      <SelectTrigger>
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
