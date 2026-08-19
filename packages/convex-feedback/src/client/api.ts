import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";

import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
  FeedbackComment,
  FeedbackEntry,
  SimilarEntriesResult,
} from "../component/model.js";

export interface FeedbackPublicApi<
  Name extends string | undefined = string | undefined,
> {
  listEntries: FunctionReference<
    "query",
    "public",
    {
      paginationOpts: PaginationOptions;
      kind?: EntryKind;
      status?: EntryStatus;
      sort?: EntrySort;
    },
    PaginationResult<FeedbackEntry>,
    Name
  >;
  getEntry: FunctionReference<
    "query",
    "public",
    { entryId: string },
    FeedbackEntry | null,
    Name
  >;
  searchEntries: FunctionReference<
    "query",
    "public",
    {
      searchQuery: string;
      kind?: EntryKind;
      status?: EntryStatus;
      limit?: number;
    },
    FeedbackEntry[],
    Name
  >;
  findSimilarEntries: FunctionReference<
    "query",
    "public",
    { title: string; body: string; kind?: EntryKind; limit?: number },
    SimilarEntriesResult,
    Name
  >;
  createEntry: FunctionReference<
    "mutation",
    "public",
    { kind: EntryKind; title: string; body: string },
    string,
    Name
  >;
  updateEntry: FunctionReference<
    "mutation",
    "public",
    { entryId: string; title: string; body: string },
    null,
    Name
  >;
  setEntryStatus: FunctionReference<
    "mutation",
    "public",
    { entryId: string; status: EntryStatus },
    null,
    Name
  >;
  setEntryUpvote: FunctionReference<
    "mutation",
    "public",
    { entryId: string; desiredState: boolean },
    { active: boolean; upvoteCount: number },
    Name
  >;
  listComments: FunctionReference<
    "query",
    "public",
    {
      paginationOpts: PaginationOptions;
      entryId: string;
      parentCommentId?: string;
      sort?: CommentSort;
    },
    PaginationResult<FeedbackComment>,
    Name
  >;
  createComment: FunctionReference<
    "mutation",
    "public",
    { entryId: string; parentCommentId?: string; body: string },
    string,
    Name
  >;
  updateComment: FunctionReference<
    "mutation",
    "public",
    { commentId: string; body: string },
    null,
    Name
  >;
  deleteComment: FunctionReference<
    "mutation",
    "public",
    { commentId: string },
    null,
    Name
  >;
  setCommentLike: FunctionReference<
    "mutation",
    "public",
    { commentId: string; desiredState: boolean },
    { active: boolean; likeCount: number },
    Name
  >;
}
