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
    admin: {
      getEntry: FunctionReference<
        "query",
        "internal",
        { entryId: string; viewerActorId: string },
        {
          actorId: string;
          body: string;
          commentCount: number;
          creationTime: number;
          id: string;
          kind: "feedback" | "feature_request" | "bug_report";
          metadata?: {
            additional?: Record<string, string | number | boolean>;
            standard?: Record<string, string | number | boolean>;
          };
          priority?: "low" | "medium" | "high";
          roadmap?: {
            createdAt: number;
            creationTime: number;
            description?: string;
            feedbackCount: number;
            id: string;
            position: number;
            status: "planned" | "in_progress" | "shipped";
            title: string;
            updatedAt: number;
          };
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
          viewerIsAuthor?: boolean;
        } | null,
        Name
      >;
      listEntries: FunctionReference<
        "query",
        "internal",
        {
          kinds?: Array<"feedback" | "feature_request" | "bug_report">;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          priority?: "low" | "medium" | "high";
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          viewerActorId: string;
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
            priority?: "low" | "medium" | "high";
            roadmap?: {
              createdAt: number;
              creationTime: number;
              description?: string;
              feedbackCount: number;
              id: string;
              position: number;
              status: "planned" | "in_progress" | "shipped";
              title: string;
              updatedAt: number;
            };
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
            viewerIsAuthor?: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      searchEntries: FunctionReference<
        "query",
        "internal",
        {
          kinds?: Array<"feedback" | "feature_request" | "bug_report">;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          priority?: "low" | "medium" | "high";
          searchQuery: string;
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          viewerActorId: string;
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
            priority?: "low" | "medium" | "high";
            roadmap?: {
              createdAt: number;
              creationTime: number;
              description?: string;
              feedbackCount: number;
              id: string;
              position: number;
              status: "planned" | "in_progress" | "shipped";
              title: string;
              updatedAt: number;
            };
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
            viewerIsAuthor?: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
    };
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
        {
          comment: {
            actorId: string;
            body: string;
            depth: number;
            entryId: string;
            id: string;
            parentCommentId?: string;
          };
          entry: {
            actorId: string;
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
          };
          id: string;
          parentComment?: { actorId: string; id: string };
        },
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
      listByActor: FunctionReference<
        "query",
        "internal",
        {
          actorId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
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
            entryTitle: string | null;
            id: string;
            likeCount: number;
            parentCommentId?: string;
            replyCount: number;
            updatedAt?: number;
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
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
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
        | {
            active: boolean;
            changed: false;
            count: number;
            previousCount: number;
            transition: null;
          }
        | {
            active: boolean;
            changed: true;
            comment: {
              actorId: string;
              body: string;
              entryId: string;
              id: string;
              parentCommentId?: string;
            };
            count: number;
            entry: { actorId: string; id: string; title: string };
            previousCount: number;
            transition: "added" | "removed";
          },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
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
          metadata?: {
            additional?: Record<string, string | number | boolean>;
            standard?: Record<string, string | number | boolean>;
          };
          title: string;
        },
        {
          entry: {
            actorId: string;
            body: string;
            commentCount: number;
            id: string;
            kind: "feedback" | "feature_request" | "bug_report";
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
            status:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "completed"
              | "closed";
            title: string;
            upvoteCount: number;
          };
          id: string;
        },
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string; viewerActorId?: string; viewerIsAdmin?: boolean },
        {
          actorId: string;
          body: string;
          commentCount: number;
          creationTime: number;
          id: string;
          kind: "feedback" | "feature_request" | "bug_report";
          metadata?: {
            additional?: Record<string, string | number | boolean>;
            standard?: Record<string, string | number | boolean>;
          };
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
          viewerIsAuthor?: boolean;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          kinds?: Array<"feedback" | "feature_request" | "bug_report">;
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
          statusFilter?: "open" | "closed";
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
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
            viewerIsAuthor?: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listByActor: FunctionReference<
        "query",
        "internal",
        {
          actorId: string;
          includeAdminContext?: boolean;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
            priority?: "low" | "medium" | "high";
            roadmap?: {
              createdAt: number;
              creationTime: number;
              description?: string;
              feedbackCount: number;
              id: string;
              position: number;
              status: "planned" | "in_progress" | "shipped";
              title: string;
              updatedAt: number;
            };
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
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          entryId: string;
        },
        null,
        Name
      >;
      search: FunctionReference<
        "query",
        "internal",
        {
          kinds?: Array<"feedback" | "feature_request" | "bug_report">;
          limit: number;
          searchQuery: string;
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "completed"
            | "closed";
          statusFilter?: "open" | "closed";
          viewerActorId?: string;
        },
        Array<{
          actorId: string;
          body: string;
          commentCount: number;
          creationTime: number;
          id: string;
          kind: "feedback" | "feature_request" | "bug_report";
          metadata?: {
            additional?: Record<string, string | number | boolean>;
            standard?: Record<string, string | number | boolean>;
          };
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
          viewerIsAuthor?: boolean;
        }>,
        Name
      >;
      setPriority: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          entryId: string;
          priority: "low" | "medium" | "high" | null;
        },
        null,
        Name
      >;
      setStatus: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
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
        | {
            active: boolean;
            changed: false;
            count: number;
            previousCount: number;
            transition: null;
          }
        | {
            active: boolean;
            changed: true;
            count: number;
            entry: {
              actorId: string;
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
            };
            previousCount: number;
            transition: "added" | "removed";
          },
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
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
            viewerIsAuthor?: boolean;
          }>;
          similar: Array<{
            actorId: string;
            body: string;
            commentCount: number;
            creationTime: number;
            id: string;
            kind: "feedback" | "feature_request" | "bug_report";
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
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
            viewerIsAuthor?: boolean;
          }>;
        },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          body: string;
          editableByAuthor: boolean;
          entryId: string;
          kind?: "feedback" | "feature_request" | "bug_report";
          maxBodyLength: number;
          maxTitleLength: number;
          title: string;
        },
        null,
        Name
      >;
    };
    reactions: {
      listByActor: FunctionReference<
        "query",
        "internal",
        {
          actorId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<
            | {
                creationTime: number;
                entry: {
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
                } | null;
                id: string;
                type: "entry_upvote";
              }
            | {
                comment: {
                  body: string | null;
                  entryId: string;
                  entryTitle: string | null;
                  id: string;
                } | null;
                creationTime: number;
                id: string;
                type: "comment_like";
              }
          >;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
    };
    roadmap: {
      attachFeedback: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          entryId: string;
          roadmapId: string;
        },
        null,
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          description?: string;
          status: "planned" | "in_progress" | "shipped";
          title: string;
        },
        string,
        Name
      >;
      createForEntry: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          description?: string;
          entryId: string;
          status: "planned" | "in_progress" | "shipped";
          title: string;
        },
        string,
        Name
      >;
      detachFeedback: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          entryId: string;
        },
        null,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { roadmapId: string },
        {
          createdAt: number;
          creationTime: number;
          description?: string;
          feedbackCount: number;
          id: string;
          position: number;
          status: "planned" | "in_progress" | "shipped";
          title: string;
          updatedAt: number;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status?: "planned" | "in_progress" | "shipped";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            creationTime: number;
            description?: string;
            feedbackCount: number;
            id: string;
            position: number;
            status: "planned" | "in_progress" | "shipped";
            title: string;
            updatedAt: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listFeedback: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          roadmapId: string;
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
            metadata?: {
              additional?: Record<string, string | number | boolean>;
              standard?: Record<string, string | number | boolean>;
            };
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
            viewerIsAuthor?: boolean;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      move: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          nextItemId?: string;
          previousItemId?: string;
          roadmapId: string;
          status: "planned" | "in_progress" | "shipped";
        },
        number,
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          roadmapId: string;
        },
        null,
        Name
      >;
      search: FunctionReference<
        "query",
        "internal",
        { limit: number; searchQuery: string },
        Array<{
          createdAt: number;
          creationTime: number;
          description?: string;
          feedbackCount: number;
          id: string;
          position: number;
          status: "planned" | "in_progress" | "shipped";
          title: string;
          updatedAt: number;
        }>,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          actor: { id: string; isAdmin?: boolean; isModerator?: boolean };
          description?: string;
          roadmapId: string;
          title: string;
        },
        null,
        Name
      >;
    };
  };
