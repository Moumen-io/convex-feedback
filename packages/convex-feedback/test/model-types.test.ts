import type { Infer } from "convex/values";
import { expectTypeOf, test } from "vitest";

import type {
  actorValidator,
  adminEntryValidator,
  commentSortValidator,
  entryKindValidator,
  entryPriorityValidator,
  entrySortValidator,
  entryStatusFilterValidator,
  entryStatusValidator,
  feedbackMetadataValidator,
  feedbackMetadataValueValidator,
  publicCommentValidator,
  publicEntryValidator,
  roadmapItemValidator,
  roadmapStatusValidator,
  similarEntriesValidator,
} from "../src/component/model.js";
import type {
  AdminFeedbackEntry,
  CommentSort,
  EntryKind,
  EntryPriority,
  EntrySort,
  EntryStatus,
  EntryStatusFilter,
  FeedbackActor,
  FeedbackComment,
  FeedbackEntry,
  FeedbackMetadata,
  FeedbackMetadataValue,
  RoadmapItem,
  RoadmapStatus,
  SimilarEntriesResult,
} from "../src/component/model.js";

type InferredFeedbackActor = Infer<typeof actorValidator>;
type InferredRoadmapItem = Infer<typeof roadmapItemValidator>;
type InferredFeedbackMetadata = Infer<typeof feedbackMetadataValidator>;
type InferredFeedbackEntry = Infer<typeof publicEntryValidator>;
type InferredAdminFeedbackEntry = Infer<typeof adminEntryValidator>;
type InferredFeedbackComment = Infer<typeof publicCommentValidator>;
type InferredSimilarEntriesResult = Infer<typeof similarEntriesValidator>;

type Equivalent<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type OptionalKeys<T extends object> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

type ExpectedFeedbackActor = {
  id: string;
  isAdmin?: boolean;
  isModerator?: boolean;
};

type ExpectedRoadmapItem = {
  id: string;
  creationTime: number;
  title: string;
  description?: string;
  status: RoadmapStatus;
  position: number;
  createdAt: number;
  updatedAt: number;
  feedbackCount: number;
};

type ExpectedFeedbackMetadata = {
  standard?: Record<string, FeedbackMetadataValue>;
  additional?: Record<string, FeedbackMetadataValue>;
};

type ExpectedFeedbackEntry = {
  id: string;
  creationTime: number;
  actorId: string;
  kind: EntryKind;
  status: EntryStatus;
  title: string;
  body: string;
  upvoteCount: number;
  commentCount: number;
  updatedAt?: number;
  viewerHasUpvoted: boolean;
  viewerIsAuthor?: boolean;
  metadata?: FeedbackMetadata;
};

type ExpectedAdminFeedbackEntry = ExpectedFeedbackEntry & {
  priority?: EntryPriority;
  roadmap?: RoadmapItem;
};

type ExpectedFeedbackComment = {
  id: string;
  creationTime: number;
  entryId: string;
  parentCommentId?: string;
  actorId: string;
  depth: number;
  body: string | null;
  likeCount: number;
  replyCount: number;
  updatedAt?: number;
  deletedAt?: number;
  viewerHasLiked: boolean;
};

type ExpectedSimilarEntriesResult = {
  exact: FeedbackEntry[];
  similar: FeedbackEntry[];
};

test("characterizes the public model types against their validators", () => {
  expectTypeOf<Infer<typeof entryKindValidator>>().toEqualTypeOf<EntryKind>();
  expectTypeOf<
    Infer<typeof entryStatusValidator>
  >().toEqualTypeOf<EntryStatus>();
  expectTypeOf<
    Infer<typeof entryStatusFilterValidator>
  >().toEqualTypeOf<EntryStatusFilter>();
  expectTypeOf<Infer<typeof entrySortValidator>>().toEqualTypeOf<EntrySort>();
  expectTypeOf<
    Infer<typeof entryPriorityValidator>
  >().toEqualTypeOf<EntryPriority>();
  expectTypeOf<
    Infer<typeof roadmapStatusValidator>
  >().toEqualTypeOf<RoadmapStatus>();
  expectTypeOf<
    Infer<typeof commentSortValidator>
  >().toEqualTypeOf<CommentSort>();
  expectTypeOf<
    Infer<typeof feedbackMetadataValueValidator>
  >().toEqualTypeOf<FeedbackMetadataValue>();

  expectTypeOf<
    Equivalent<InferredFeedbackActor, FeedbackActor>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredRoadmapItem, RoadmapItem>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredFeedbackMetadata, FeedbackMetadata>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredFeedbackEntry, FeedbackEntry>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredAdminFeedbackEntry, AdminFeedbackEntry>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredFeedbackComment, FeedbackComment>
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Equivalent<InferredSimilarEntriesResult, SimilarEntriesResult>
  >().toEqualTypeOf<true>();

  expectTypeOf<FeedbackActor>().toEqualTypeOf<ExpectedFeedbackActor>();
  expectTypeOf<FeedbackActor["id"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackActor["isAdmin"]>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf<FeedbackActor["isModerator"]>().toEqualTypeOf<
    boolean | undefined
  >();
  expectTypeOf<OptionalKeys<FeedbackActor>>().toEqualTypeOf<
    "isAdmin" | "isModerator"
  >();
  expectTypeOf<RequiredKeys<FeedbackActor>>().toEqualTypeOf<"id">();

  expectTypeOf<RoadmapItem>().toEqualTypeOf<ExpectedRoadmapItem>();
  expectTypeOf<RoadmapItem["id"]>().toEqualTypeOf<string>();
  expectTypeOf<RoadmapItem["creationTime"]>().toEqualTypeOf<number>();
  expectTypeOf<RoadmapItem["title"]>().toEqualTypeOf<string>();
  expectTypeOf<RoadmapItem["description"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<RoadmapItem["status"]>().toEqualTypeOf<RoadmapStatus>();
  expectTypeOf<RoadmapItem["position"]>().toEqualTypeOf<number>();
  expectTypeOf<RoadmapItem["createdAt"]>().toEqualTypeOf<number>();
  expectTypeOf<RoadmapItem["updatedAt"]>().toEqualTypeOf<number>();
  expectTypeOf<RoadmapItem["feedbackCount"]>().toEqualTypeOf<number>();
  expectTypeOf<OptionalKeys<RoadmapItem>>().toEqualTypeOf<"description">();
  expectTypeOf<RequiredKeys<RoadmapItem>>().toEqualTypeOf<
    Exclude<keyof ExpectedRoadmapItem, "description">
  >();

  expectTypeOf<FeedbackMetadata>().toEqualTypeOf<ExpectedFeedbackMetadata>();
  expectTypeOf<FeedbackMetadata["standard"]>().toEqualTypeOf<
    Record<string, FeedbackMetadataValue> | undefined
  >();
  expectTypeOf<FeedbackMetadata["additional"]>().toEqualTypeOf<
    Record<string, FeedbackMetadataValue> | undefined
  >();
  expectTypeOf<OptionalKeys<FeedbackMetadata>>().toEqualTypeOf<
    "standard" | "additional"
  >();
  expectTypeOf<RequiredKeys<FeedbackMetadata>>().toEqualTypeOf<never>();

  expectTypeOf<FeedbackEntry>().toEqualTypeOf<ExpectedFeedbackEntry>();
  expectTypeOf<FeedbackEntry["id"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackEntry["creationTime"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackEntry["actorId"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackEntry["kind"]>().toEqualTypeOf<EntryKind>();
  expectTypeOf<FeedbackEntry["status"]>().toEqualTypeOf<EntryStatus>();
  expectTypeOf<FeedbackEntry["title"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackEntry["body"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackEntry["upvoteCount"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackEntry["commentCount"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackEntry["updatedAt"]>().toEqualTypeOf<
    number | undefined
  >();
  expectTypeOf<FeedbackEntry["viewerHasUpvoted"]>().toEqualTypeOf<boolean>();
  expectTypeOf<FeedbackEntry["viewerIsAuthor"]>().toEqualTypeOf<
    boolean | undefined
  >();
  expectTypeOf<FeedbackEntry["metadata"]>().toEqualTypeOf<
    FeedbackMetadata | undefined
  >();
  expectTypeOf<OptionalKeys<FeedbackEntry>>().toEqualTypeOf<
    "updatedAt" | "viewerIsAuthor" | "metadata"
  >();
  expectTypeOf<RequiredKeys<FeedbackEntry>>().toEqualTypeOf<
    Exclude<
      keyof ExpectedFeedbackEntry,
      "updatedAt" | "viewerIsAuthor" | "metadata"
    >
  >();

  expectTypeOf<AdminFeedbackEntry>().toMatchTypeOf<ExpectedAdminFeedbackEntry>();
  expectTypeOf<ExpectedAdminFeedbackEntry>().toMatchTypeOf<AdminFeedbackEntry>();
  expectTypeOf<AdminFeedbackEntry["priority"]>().toEqualTypeOf<
    EntryPriority | undefined
  >();
  expectTypeOf<AdminFeedbackEntry["roadmap"]>().toEqualTypeOf<
    RoadmapItem | undefined
  >();
  expectTypeOf<OptionalKeys<AdminFeedbackEntry>>().toEqualTypeOf<
    "updatedAt" | "viewerIsAuthor" | "metadata" | "priority" | "roadmap"
  >();

  expectTypeOf<FeedbackComment>().toEqualTypeOf<ExpectedFeedbackComment>();
  expectTypeOf<FeedbackComment["id"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackComment["creationTime"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackComment["entryId"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackComment["parentCommentId"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<FeedbackComment["actorId"]>().toEqualTypeOf<string>();
  expectTypeOf<FeedbackComment["depth"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackComment["body"]>().toEqualTypeOf<string | null>();
  expectTypeOf<FeedbackComment["likeCount"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackComment["replyCount"]>().toEqualTypeOf<number>();
  expectTypeOf<FeedbackComment["updatedAt"]>().toEqualTypeOf<
    number | undefined
  >();
  expectTypeOf<FeedbackComment["deletedAt"]>().toEqualTypeOf<
    number | undefined
  >();
  expectTypeOf<FeedbackComment["viewerHasLiked"]>().toEqualTypeOf<boolean>();
  expectTypeOf<OptionalKeys<FeedbackComment>>().toEqualTypeOf<
    "parentCommentId" | "updatedAt" | "deletedAt"
  >();

  expectTypeOf<SimilarEntriesResult>().toEqualTypeOf<ExpectedSimilarEntriesResult>();
  expectTypeOf<SimilarEntriesResult["exact"]>().toEqualTypeOf<
    FeedbackEntry[]
  >();
  expectTypeOf<SimilarEntriesResult["similar"]>().toEqualTypeOf<
    FeedbackEntry[]
  >();
  expectTypeOf<OptionalKeys<SimilarEntriesResult>>().toEqualTypeOf<never>();
  expectTypeOf<RequiredKeys<SimilarEntriesResult>>().toEqualTypeOf<
    "exact" | "similar"
  >();
});

test("characterizes actor deprecation documentation", () => {
  const actor = {} as FeedbackActor;

  void actor.id;
  void actor.isAdmin;

  // @ts-expect-deprecated -- isModerator remains only for compatibility.
  void actor.isModerator;
});
