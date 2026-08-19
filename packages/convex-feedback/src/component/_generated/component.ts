/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    comments: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          actorId: string;
          body: string;
          entryId: string;
          maxCommentLength: number;
          maxDepth: number;
          parentCommentId?: string;
        },
        string,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          parentCommentId?: string;
          sort: "top" | "newest" | "oldest";
          viewerActorId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            actorId: string;
            body: string | null;
            creationTime: number;
            deletedAt?: number;
            depth: number;
            entryId: string;
            id: string;
            likeCount: number;
            parentCommentId?: string;
            replyCount: number;
            updatedAt?: number;
            viewerHasLiked: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isModerator: boolean };
          commentId: string;
          deletableByAuthor: boolean;
        },
        null,
        Name
      >;
      setLike: FunctionReference<
        "mutation",
        "internal",
        { actorId: string; commentId: string; desiredState: boolean },
        { active: boolean; likeCount: number },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isModerator: boolean };
          body: string;
          commentId: string;
          editableByAuthor: boolean;
          maxCommentLength: number;
        },
        null,
        Name
      >;
    };
    entries: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          actorId: string;
          body: string;
          defaultStatus:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          enabledKinds: Array<"feedback" | "feature_request" | "bug_report">;
          kind: "feedback" | "feature_request" | "bug_report";
          maxBodyLength: number;
          maxTitleLength: number;
          title: string;
        },
        string,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string; viewerActorId?: string },
        {
          actorId: string;
          body: string;
          commentCount: number;
          creationTime: number;
          id: string;
          kind: "feedback" | "feature_request" | "bug_report";
          status:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          title: string;
          updatedAt?: number;
          upvoteCount: number;
          viewerHasUpvoted: boolean;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          kind?: "feedback" | "feature_request" | "bug_report";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          sort: "top" | "newest";
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          viewerActorId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            actorId: string;
            body: string;
            commentCount: number;
            creationTime: number;
            id: string;
            kind: "feedback" | "feature_request" | "bug_report";
            status:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "completed"
              | "closed";
            title: string;
            updatedAt?: number;
            upvoteCount: number;
            viewerHasUpvoted: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      search: FunctionReference<
        "query",
        "internal",
        {
          kind?: "feedback" | "feature_request" | "bug_report";
          limit: number;
          searchQuery: string;
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          viewerActorId?: string;
        },
        Array<{
          actorId: string;
          body: string;
          commentCount: number;
          creationTime: number;
          id: string;
          kind: "feedback" | "feature_request" | "bug_report";
          status:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          title: string;
          updatedAt?: number;
          upvoteCount: number;
          viewerHasUpvoted: boolean;
        }>,
        Name
      >;
      setStatus: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isModerator: boolean };
          entryId: string;
          status:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
        },
        null,
        Name
      >;
      setUpvote: FunctionReference<
        "mutation",
        "internal",
        { actorId: string; desiredState: boolean; entryId: string },
        { active: boolean; upvoteCount: number },
        Name
      >;
      similar: FunctionReference<
        "query",
        "internal",
        {
          body: string;
          kind?: "feedback" | "feature_request" | "bug_report";
          limit: number;
          title: string;
          viewerActorId?: string;
        },
        {
          exact: Array<{
            actorId: string;
            body: string;
            commentCount: number;
            creationTime: number;
            id: string;
            kind: "feedback" | "feature_request" | "bug_report";
            status:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "completed"
              | "closed";
            title: string;
            updatedAt?: number;
            upvoteCount: number;
            viewerHasUpvoted: boolean;
          }>;
          similar: Array<{
            actorId: string;
            body: string;
            commentCount: number;
            creationTime: number;
            id: string;
            kind: "feedback" | "feature_request" | "bug_report";
            status:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "completed"
              | "closed";
            title: string;
            updatedAt?: number;
            upvoteCount: number;
            viewerHasUpvoted: boolean;
          }>;
        },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isModerator: boolean };
          body: string;
          editableByAuthor: boolean;
          entryId: string;
          maxBodyLength: number;
          maxTitleLength: number;
          title: string;
        },
        null,
        Name
      >;
    };
  };
