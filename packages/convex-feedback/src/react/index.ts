"use client";

import { usePaginatedQuery } from "convex-helpers/react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";

import type { FeedbackPublicApi } from "../client/api.js";
import type {
  CommentSort,
  EntryKind,
  EntryPriority,
  EntrySort,
  EntryStatus,
  EntryStatusFilter,
  RoadmapStatus,
  SimilarEntriesResult,
} from "../component/model.js";

/**
 * Client-side pagination defaults used by hooks created with
 * `createFeedbackHooks`.
 *
 * These values control initial page sizes and subsequent `loadMore` sizes in
 * the UI. They do not override the server-side maximum page sizes configured
 * on the component.
 */
export interface FeedbackHooksOptions {
  /**
   * Number of entries initially requested by entry-list hooks, including the
   * public board, admin inbox, admin search, and roadmap attachments.
   *
   * @default 20
   */
  entryPageSize?: number;

  /**
   * Number of top-level comments initially requested by `useComments`.
   *
   * @default 20
   */
  commentPageSize?: number;

  /**
   * Number of direct child replies initially requested when
   * `parentCommentId` is supplied to `useComments`.
   *
   * @default 10
   */
  replyPageSize?: number;

  /**
   * Number of roadmap items initially requested by `useRoadmap`.
   *
   * @default 30
   */
  roadmapPageSize?: number;
}

/**
 * Arguments accepted by `useEntries`.
 */
export interface UseEntriesArgs {
  /**
   * Entry kinds to include.
   *
   * Filtering occurs in Convex before pagination. Omit to include every kind.
   *
   * The hook accepts a readonly array so configuration constants such as
   * `readonly EntryKind[]` can be passed directly.
   */
  kinds?: readonly EntryKind[];

  /** Optional workflow-status filter. */
  status?: EntryStatus;

  /** Optional indexed open or closed board bucket. */
  statusFilter?: EntryStatusFilter;

  /**
   * Server-side entry ordering.
   *
   * When omitted, the host's configured default is used.
   */
  sort?: EntrySort;
}

/**
 * Arguments accepted by `useComments`.
 *
 * Comment trees are intentionally loaded lazily. Every invocation retrieves
 * exactly one level of the tree.
 */
export interface UseCommentsArgs {
  /** Entry whose comments are being requested. */
  entryId: string;

  /**
   * Direct parent whose replies should be requested.
   *
   * - Omitted → returns top-level comments.
   * - Supplied → returns only direct children of this comment.
   *
   * Grandchildren and deeper descendants are never automatically loaded.
   * Call `useComments` again with the child comment's ID when that branch is
   * expanded.
   */
  parentCommentId?: string;

  /**
   * Server-side ordering for this level of comments.
   *
   * When omitted, the host's configured default is used.
   */
  sort?: CommentSort;
}

/**
 * Arguments accepted by `useSearchEntries`.
 */
export interface SearchEntriesArgs {
  /**
   * Full-text query.
   *
   * Whitespace-only values skip the Convex query and return an empty array.
   */
  searchQuery: string;

  /**
   * Entry kinds to include.
   *
   * Filtering occurs on the server.
   */
  kinds?: readonly EntryKind[];

  /** Optional workflow-status filter. */
  status?: EntryStatus;

  /** Optional indexed open or closed board bucket. */
  statusFilter?: EntryStatusFilter;

  /**
   * Maximum number of results requested.
   *
   * The server applies its configured default when omitted and clamps the
   * value to its configured maximum.
   */
  limit?: number;
}

export interface UseAdminEntriesArgs {
  kinds?: readonly EntryKind[];
  status?: EntryStatus;
  priority?: EntryPriority;
  tagId?: string;
}

export interface UseAdminSearchEntriesArgs extends UseAdminEntriesArgs {
  searchQuery: string;
}

/**
 * Arguments accepted by `useSimilarEntries`.
 */
export interface SimilarEntriesArgs {
  /**
   * Proposed entry title.
   *
   * Used both for normalized exact-title matching and full-text search.
   */
  title: string;

  /**
   * Proposed entry body.
   *
   * Used together with the title for full-text similarity search.
   */
  body: string;

  /**
   * Restricts duplicate detection to one entry kind.
   *
   * Omit to search every kind.
   */
  kind?: EntryKind;

  /**
   * Maximum combined number of suggestions requested.
   *
   * Exact normalized-title matches consume the limit first. Only remaining
   * slots may be filled by relevance-ranked full-text matches.
   *
   * For example, `limit: 3` with two exact matches can return at most one
   * additional similar match.
   */
  limit?: number;
}

const emptySimilarEntriesResult: SimilarEntriesResult = {
  exact: [],
  similar: [],
};

function positivePageSize(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

/**
 * Creates React hooks bound to a host application's exposed feedback API.
 *
 * Create this once in the consuming application and reuse the returned hook
 * collection.
 *
 * @typeParam RateLimitResult The validated non-throwing rate-limit rejection
 * type returned by mutation hooks. It is inferred from the supplied API.
 */
function createFeedbackHooksImplementation<RateLimitResult>(
  api: FeedbackPublicApi<string | undefined, RateLimitResult>,
  options: FeedbackHooksOptions = {},
) {
  const entryPageSize = positivePageSize(options.entryPageSize, 20);
  const commentPageSize = positivePageSize(options.commentPageSize, 20);
  const replyPageSize = positivePageSize(options.replyPageSize, 10);
  const roadmapPageSize = positivePageSize(options.roadmapPageSize, 30);

  return {
    /**
     * Resolved client-side page sizes used by the generated hooks and useful
     * when calling their `loadMore` functions.
     */
    pageSizes: {
      entries: entryPageSize,
      comments: commentPageSize,
      replies: replyPageSize,
      roadmap: roadmapPageSize,
    } as const,

    /**
     * Returns a cursor-paginated, server-filtered entry list.
     */
    useEntries(args: UseEntriesArgs = {}) {
      const queryArgs = {
        ...(args.kinds === undefined ? {} : { kinds: [...args.kinds] }),
        ...(args.status === undefined ? {} : { status: args.status }),
        ...(args.statusFilter === undefined
          ? {}
          : { statusFilter: args.statusFilter }),
        ...(args.sort === undefined ? {} : { sort: args.sort }),
      };

      return usePaginatedQuery(api.listEntries, queryArgs, {
        initialNumItems: entryPageSize,
      });
    },

    /**
     * Reactively retrieves one entry.
     *
     * Passing `null` or `undefined` skips the query.
     */
    useEntry(entryId: string | null | undefined) {
      return useQuery(
        api.getEntry,
        entryId === null || entryId === undefined ? "skip" : { entryId },
      );
    },

    /**
     * Performs reactive full-text entry search.
     *
     * An empty/whitespace-only query returns `[]` without running Convex.
     */
    useSearchEntries(args: SearchEntriesArgs) {
      const searchQuery = args.searchQuery.trim();

      const queryArgs = {
        searchQuery,
        ...(args.kinds === undefined ? {} : { kinds: [...args.kinds] }),
        ...(args.status === undefined ? {} : { status: args.status }),
        ...(args.statusFilter === undefined
          ? {}
          : { statusFilter: args.statusFilter }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
      };

      const result = useQuery(
        api.searchEntries,
        searchQuery.length === 0 ? "skip" : queryArgs,
      );

      return searchQuery.length === 0 ? [] : result;
    },

    /** Returns whether the authenticated host actor is an admin. */
    useIsAdmin() {
      return useQuery(api.isAdmin, {});
    },

    /** Returns a cursor-paginated admin inbox with private triage relationships. */
    useAdminEntries(args: UseAdminEntriesArgs = {}) {
      return usePaginatedQuery(
        api.adminListEntries,
        {
          ...(args.kinds === undefined ? {} : { kinds: [...args.kinds] }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.priority === undefined ? {} : { priority: args.priority }),
          ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
        },
        { initialNumItems: entryPageSize },
      );
    },

    /** Returns one admin-enriched feedback entry. */
    useAdminEntry(entryId: string | null | undefined) {
      return useQuery(
        api.adminGetEntry,
        entryId === null || entryId === undefined ? "skip" : { entryId },
      );
    },

    /** Searches the admin inbox with triage filters. */
    useAdminSearchEntries(args: UseAdminSearchEntriesArgs) {
      const searchQuery = args.searchQuery.trim();
      return usePaginatedQuery(
        api.adminSearchEntries,
        searchQuery.length === 0
          ? "skip"
          : {
              searchQuery,
              ...(args.kinds === undefined ? {} : { kinds: [...args.kinds] }),
              ...(args.status === undefined ? {} : { status: args.status }),
              ...(args.priority === undefined
                ? {}
                : { priority: args.priority }),
              ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
            },
        { initialNumItems: entryPageSize },
      );
    },

    useTags() {
      return useQuery(api.listTags, {});
    },

    useRoadmap(status?: RoadmapStatus) {
      return usePaginatedQuery(
        api.listRoadmap,
        status === undefined ? {} : { status },
        { initialNumItems: roadmapPageSize },
      );
    },

    useSearchRoadmap(searchQuery: string, limit = 10) {
      const normalized = searchQuery.trim();
      return useQuery(
        api.searchRoadmap,
        normalized.length === 0 ? "skip" : { searchQuery: normalized, limit },
      );
    },

    useRoadmapFeedback(roadmapId: string | null | undefined) {
      return usePaginatedQuery(
        api.listRoadmapFeedback,
        roadmapId === null || roadmapId === undefined ? "skip" : { roadmapId },
        { initialNumItems: entryPageSize },
      );
    },

    /**
     * Reactively finds exact and similar entries for a proposed draft.
     *
     * The query is skipped only when both title and body are blank.
     *
     * `limit` is forwarded to the server unchanged. The server applies the
     * combined exact-first limit semantics documented by `SimilarEntriesArgs`.
     */
    useSimilarEntries(args: SimilarEntriesArgs) {
      const shouldSkip =
        args.title.trim().length === 0 && args.body.trim().length === 0;

      const queryArgs = {
        title: args.title,
        body: args.body,
        ...(args.kind === undefined ? {} : { kind: args.kind }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
      };

      const result = useQuery(
        api.findSimilarEntries,
        shouldSkip ? "skip" : queryArgs,
      );

      return shouldSkip ? emptySimilarEntriesResult : result;
    },

    /**
     * Returns one independently paginated level of comments.
     */
    useComments(args: UseCommentsArgs) {
      return usePaginatedQuery(api.listComments, args, {
        initialNumItems:
          args.parentCommentId === undefined ? commentPageSize : replyPageSize,
      });
    },

    /** Returns the bound create-entry mutation. */
    useCreateEntry() {
      return useMutation(api.createEntry);
    },

    /** Returns the bound update-entry mutation. */
    useUpdateEntry() {
      return useMutation(api.updateEntry);
    },

    /** Returns the bound status mutation. */
    useSetEntryStatus() {
      return useMutation(api.setEntryStatus);
    },

    useSetEntryPriority() {
      return useMutation(api.setEntryPriority);
    },

    useCreateTag() {
      return useMutation(api.createTag);
    },

    useUpdateTag() {
      return useMutation(api.updateTag);
    },

    useDeleteTag() {
      return useMutation(api.deleteTag);
    },

    useAttachTag() {
      return useMutation(api.attachTag);
    },

    useDetachTag() {
      return useMutation(api.detachTag);
    },

    useCreateRoadmap() {
      return useMutation(api.createRoadmap);
    },

    useCreateRoadmapForEntry() {
      return useMutation(api.createRoadmapForEntry);
    },

    useUpdateRoadmap() {
      return useMutation(api.updateRoadmap);
    },

    useDeleteRoadmap() {
      return useMutation(api.deleteRoadmap);
    },

    useMoveRoadmapItem() {
      return useMutation(api.moveRoadmapItem);
    },

    useAttachFeedbackToRoadmap() {
      return useMutation(api.attachFeedbackToRoadmap);
    },

    useDetachFeedbackFromRoadmap() {
      return useMutation(api.detachFeedbackFromRoadmap);
    },

    /** Returns the idempotent entry-upvote state mutation. */
    useSetEntryUpvote() {
      return useMutation(api.setEntryUpvote);
    },

    /** Returns the create-comment/reply mutation. */
    useCreateComment() {
      return useMutation(api.createComment);
    },

    /** Returns the update-comment mutation. */
    useUpdateComment() {
      return useMutation(api.updateComment);
    },

    /** Returns the soft-delete-comment mutation. */
    useDeleteComment() {
      return useMutation(api.deleteComment);
    },

    /** Returns the idempotent comment-like state mutation. */
    useSetCommentLike() {
      return useMutation(api.setCommentLike);
    },
  };
}

type CreatedFeedbackHooks<RateLimitResult> = ReturnType<
  typeof createFeedbackHooksImplementation<RateLimitResult>
>;

/** Creates hooks for a feedback API whose rate limiters reject by throwing. */
export function createFeedbackHooks(
  api?: FeedbackPublicApi<string | undefined, never>,
  options?: FeedbackHooksOptions,
): CreatedFeedbackHooks<never>;

/** Creates hooks carrying a validated non-throwing rate-limit result. */
export function createFeedbackHooks<RateLimitResult>(
  api?: FeedbackPublicApi<string | undefined, RateLimitResult>,
  options?: FeedbackHooksOptions,
): CreatedFeedbackHooks<RateLimitResult>;

export function createFeedbackHooks<RateLimitResult>(
  api: FeedbackPublicApi<
    string | undefined,
    RateLimitResult
  > = anyApi.feedback as unknown as FeedbackPublicApi<
    string | undefined,
    RateLimitResult
  >,
  options: FeedbackHooksOptions = {},
): CreatedFeedbackHooks<RateLimitResult> {
  return createFeedbackHooksImplementation(api, options);
}

/**
 * Hook collection returned by `createFeedbackHooks`.
 *
 * This type is intended to be passed to `FeedbackScreen` and other
 * `convex-feedback-ui` integrations.
 *
 * @typeParam RateLimitResult The validated non-throwing rate-limit rejection
 * type returned by mutation hooks.
 */
export type FeedbackHooks<RateLimitResult = never> =
  CreatedFeedbackHooks<RateLimitResult>;
