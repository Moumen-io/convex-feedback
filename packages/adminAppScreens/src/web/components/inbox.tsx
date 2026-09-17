import type {
  AdminFeedbackEntry,
  EntryKind,
  EntryPriority,
  EntryStatus,
} from "convex-feedback";
import {
  BugIcon,
  ChevronRight,
  ChevronUp,
  InboxIcon,
  MessageSquare,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EntryEditorDialog, FeedbackSheet } from "./feedback-sheet.js";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useAdminAction } from "../lib/action";
import { feedbackHooks } from "../lib/feedback";

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
const entryStatusItems: { label: string; value: EntryStatus }[] = [
  { label: "Open", value: "open" },
  { label: "Under review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];
const entryPriorityItems: { label: string; value: string }[] = [
  { label: "No priority", value: "none" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

function KindIcon({ kind }: { kind: EntryKind }) {
  if (kind === "bug_report") return <BugIcon className="size-4" />;
  if (kind === "feature_request") return <SparklesIcon className="size-4" />;
  return <MessageSquareIcon className="size-4" />;
}

function EntryTableRow({
  entry,
  onSelect,
}: {
  entry: AdminFeedbackEntry;
  onSelect: (entryId: string) => void;
}) {
  return (
    <TableRow
      tabIndex={0}
      className="group cursor-pointer"
      onClick={() => onSelect(entry.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entry.id);
        }
      }}
    >
      <TableCell className="min-w-[22rem] max-w-[38rem]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <KindIcon kind={entry.kind} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {entry.title}
            </span>
            <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
              {entry.body}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{entry.kind.replaceAll("_", " ")}</Badge>
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <EntryStatusCell entry={entry} />
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <EntryPriorityCell entry={entry} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ChevronUp size={20} /> {entry.upvoteCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={16} /> {entry.commentCount}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-10 text-right">
        <ChevronRight
          size={20}
          className="transition-transform group-hover:translate-x-0.5 text-muted-foreground"
        />
      </TableCell>
    </TableRow>
  );
}

function EntryStatusCell({ entry }: { entry: AdminFeedbackEntry }) {
  const setStatus = feedbackHooks.useSetEntryStatus();
  const action = useAdminAction();

  return (
    <Select
      items={entryStatusItems}
      value={entry.status}
      disabled={action.pending}
      onValueChange={(next) => {
        if (!next) return;
        void action.run(
          () =>
            setStatus({
              entryId: entry.id,
              status: next as EntryStatus,
            }),
          "Status updated",
        );
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-32"
        aria-label={`Change status for ${entry.title}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        <SelectGroup>
          {entryStatusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function EntryPriorityCell({ entry }: { entry: AdminFeedbackEntry }) {
  const setPriority = feedbackHooks.useSetEntryPriority();
  const action = useAdminAction();

  return (
    <Select
      items={entryPriorityItems}
      value={entry.priority ?? "none"}
      disabled={action.pending}
      onValueChange={(next) => {
        if (!next) return;
        void action.run(
          () =>
            setPriority({
              entryId: entry.id,
              priority: next === "none" ? null : (next as EntryPriority),
            }),
          "Priority updated",
        );
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-28"
        aria-label={`Change priority for ${entry.title}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        <SelectGroup>
          {entryPriorityItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function InboxView({
  entryId,
  onEntryIdChange,
  onOpenRoadmap,
}: {
  entryId: string | null;
  onEntryIdChange: (entryId: string | null) => void;
  onOpenRoadmap: (roadmapId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
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
      <header className="flex items-start justify-between gap-4 border-b px-5 py-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Triage feedback and connect customer signals to the roadmap.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" /> New entry
        </Button>
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
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        {page.status === "LoadingFirstPage" ? (
          <Table className="min-w-[64rem]">
            <TableBody>
              {Array.from({ length: 7 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-14 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <Table className="min-w-[64rem]">
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
              <TableRow>
                <TableHead className="min-w-[22rem]">Entry</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <EntryTableRow
                  key={entry.id}
                  entry={entry}
                  onSelect={onEntryIdChange}
                />
              ))}
              {(page.status === "CanLoadMore" ||
                page.status === "LoadingMore") && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex justify-center py-2">
                      <Button
                        variant="outline"
                        disabled={page.status === "LoadingMore"}
                        onClick={(event) => {
                          event.stopPropagation();
                          page.loadMore(feedbackHooks.pageSizes.entries);
                        }}
                      >
                        {page.status === "LoadingMore" && (
                          <Spinner data-icon="inline-start" />
                        )}
                        Load more
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <FeedbackSheet
        entryId={entryId}
        onClose={() => onEntryIdChange(null)}
        onOpenRoadmap={onOpenRoadmap}
      />
      <EntryEditorDialog
        key={createOpen ? "entry-create-open" : "entry-create-closed"}
        entry={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onEntryIdChange}
      />
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
