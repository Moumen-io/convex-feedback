"use client";

import { usePaginatedQuery } from "convex-helpers/react";
import { useMutation, useQuery } from "convex/react";

import type { FeedbackPublicApi } from "../client/api.js";
import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
} from "../component/model.js";

export interface FeedbackHooksOptions {
  entryPageSize?: number;
  commentPageSize?: number;
  replyPageSize?: number;
}

export interface UseEntriesArgs {
  kind?: EntryKind;
  status?: EntryStatus;
  sort?: EntrySort;
}

export interface UseCommentsArgs {
  entryId: string;
  parentCommentId?: string;
  sort?: CommentSort;
}

export interface SearchEntriesArgs {
  searchQuery: string;
  kind?: EntryKind;
  status?: EntryStatus;
  limit?: number;
}

export interface SimilarEntriesArgs {
  title: string;
  body: string;
  kind?: EntryKind;
  limit?: number;
}

function positivePageSize(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

export function createFeedbackHooks(
  api: FeedbackPublicApi,
  options: FeedbackHooksOptions = {},
) {
  const entryPageSize = positivePageSize(options.entryPageSize, 20);
  const commentPageSize = positivePageSize(options.commentPageSize, 20);
  const replyPageSize = positivePageSize(options.replyPageSize, 10);

  return {
    pageSizes: {
      entries: entryPageSize,
      comments: commentPageSize,
      replies: replyPageSize,
    } as const,

    useEntries(args: UseEntriesArgs = {}) {
      return usePaginatedQuery(api.listEntries, args, {
        initialNumItems: entryPageSize,
      });
    },

    useEntry(entryId: string | null | undefined) {
      return useQuery(
        api.getEntry,
        entryId === null || entryId === undefined ? "skip" : { entryId },
      );
    },

    useSearchEntries(args: SearchEntriesArgs) {
      const searchQuery = args.searchQuery.trim();
      const result = useQuery(
        api.searchEntries,
        searchQuery.length === 0 ? "skip" : { ...args, searchQuery },
      );
      return searchQuery.length === 0 ? [] : result;
    },

    useSimilarEntries(args: SimilarEntriesArgs) {
      const shouldSkip =
        args.title.trim().length === 0 && args.body.trim().length === 0;
      const result = useQuery(
        api.findSimilarEntries,
        shouldSkip ? "skip" : args,
      );
      return shouldSkip ? { exact: [], similar: [] } : result;
    },

    useComments(args: UseCommentsArgs) {
      return usePaginatedQuery(api.listComments, args, {
        initialNumItems:
          args.parentCommentId === undefined ? commentPageSize : replyPageSize,
      });
    },

    useCreateEntry() {
      return useMutation(api.createEntry);
    },

    useUpdateEntry() {
      return useMutation(api.updateEntry);
    },

    useSetEntryStatus() {
      return useMutation(api.setEntryStatus);
    },

    useSetEntryUpvote() {
      return useMutation(api.setEntryUpvote);
    },

    useCreateComment() {
      return useMutation(api.createComment);
    },

    useUpdateComment() {
      return useMutation(api.updateComment);
    },

    useDeleteComment() {
      return useMutation(api.deleteComment);
    },

    useSetCommentLike() {
      return useMutation(api.setCommentLike);
    },
  };
}

export type FeedbackHooks = ReturnType<typeof createFeedbackHooks>;
