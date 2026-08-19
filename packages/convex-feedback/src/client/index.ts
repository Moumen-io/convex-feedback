import {
  mutationGeneric,
  paginationOptsValidator,
  paginationResultValidator,
  queryGeneric,
  type Auth,
  type PaginationOptions,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { ComponentApi } from "../component/_generated/component.js";
import {
  commentSortValidator,
  entryKindValidator,
  entrySortValidator,
  entryStatusValidator,
  publicCommentValidator,
  publicEntryValidator,
  similarEntriesValidator,
  type FeedbackActor,
} from "../component/model.js";
import type { FeedbackPublicApi } from "./api.js";
import {
  createFeedbackConfig,
  type FeedbackConfigOverrides,
} from "./config.js";

export type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
  FeedbackActor,
  FeedbackComment,
  FeedbackEntry,
  SimilarEntriesResult,
} from "../component/model.js";
export type { FeedbackPublicApi } from "./api.js";
export {
  createFeedbackConfig,
  defaultFeedbackConfig,
  type FeedbackConfig,
  type FeedbackConfigOverrides,
} from "./config.js";

export interface FeedbackAuthContext {
  auth: Auth;
}

export interface ExposeFeedbackOptions {
  actor: (ctx: FeedbackAuthContext) => Promise<FeedbackActor | null>;
  config?: FeedbackConfigOverrides;
}

function requireActor(actor: FeedbackActor | null): FeedbackActor {
  if (actor === null) {
    throw new ConvexError("Authentication is required.");
  }
  return actor;
}

function clampPositive(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  const candidate = value ?? fallback;
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(1, Math.min(Math.floor(candidate), maximum));
}

function clampPagination(
  paginationOpts: PaginationOptions,
  maximum: number,
): PaginationOptions {
  return {
    ...paginationOpts,
    numItems: clampPositive(paginationOpts.numItems, maximum, maximum),
  };
}

function actorIdFields(actor: FeedbackActor | null): {
  viewerActorId?: string;
} {
  return actor === null ? {} : { viewerActorId: actor.id };
}

export function exposeFeedbackApi<Name extends string | undefined>(
  component: ComponentApi<Name>,
  options: ExposeFeedbackOptions,
) {
  const config = createFeedbackConfig(options.config);

  return {
    listEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        kind: v.optional(entryKindValidator),
        status: v.optional(entryStatusValidator),
        sort: v.optional(entrySortValidator),
      },
      returns: paginationResultValidator(publicEntryValidator),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.entries.list, {
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
          ...(args.kind === undefined ? {} : { kind: args.kind }),
          ...(args.status === undefined ? {} : { status: args.status }),
          sort: args.sort ?? config.entries.defaultSort,
          ...actorIdFields(actor),
        });
      },
    }),

    getEntry: queryGeneric({
      args: { entryId: v.string() },
      returns: v.union(publicEntryValidator, v.null()),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.entries.get, {
          entryId: args.entryId,
          ...actorIdFields(actor),
        });
      },
    }),

    searchEntries: queryGeneric({
      args: {
        searchQuery: v.string(),
        kind: v.optional(entryKindValidator),
        status: v.optional(entryStatusValidator),
        limit: v.optional(v.number()),
      },
      returns: v.array(publicEntryValidator),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.entries.search, {
          searchQuery: args.searchQuery,
          ...(args.kind === undefined ? {} : { kind: args.kind }),
          ...(args.status === undefined ? {} : { status: args.status }),
          limit: clampPositive(
            args.limit,
            config.search.defaultLimit,
            config.search.maxLimit,
          ),
          ...actorIdFields(actor),
        });
      },
    }),

    findSimilarEntries: queryGeneric({
      args: {
        title: v.string(),
        body: v.string(),
        kind: v.optional(entryKindValidator),
        limit: v.optional(v.number()),
      },
      returns: similarEntriesValidator,
      handler: async (ctx, args) => {
        if (!config.search.duplicateSuggestions) {
          return { exact: [], similar: [] };
        }
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.entries.similar, {
          title: args.title,
          body: args.body,
          ...(args.kind === undefined ? {} : { kind: args.kind }),
          limit: clampPositive(
            args.limit,
            config.search.duplicateSuggestionLimit,
            config.search.maxLimit,
          ),
          ...actorIdFields(actor),
        });
      },
    }),

    createEntry: mutationGeneric({
      args: {
        kind: entryKindValidator,
        title: v.string(),
        body: v.string(),
      },
      returns: v.string(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.entries.create, {
          actorId: actor.id,
          kind: args.kind,
          title: args.title,
          body: args.body,
          defaultStatus: config.entries.defaultStatus,
          enabledKinds: [...config.entries.enabledKinds],
          maxTitleLength: config.limits.titleLength,
          maxBodyLength: config.limits.bodyLength,
        });
      },
    }),

    updateEntry: mutationGeneric({
      args: {
        entryId: v.string(),
        title: v.string(),
        body: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.entries.update, {
          actor,
          entryId: args.entryId,
          title: args.title,
          body: args.body,
          editableByAuthor: config.entries.editableByAuthor,
          maxTitleLength: config.limits.titleLength,
          maxBodyLength: config.limits.bodyLength,
        });
      },
    }),

    setEntryStatus: mutationGeneric({
      args: { entryId: v.string(), status: entryStatusValidator },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.entries.setStatus, {
          actor,
          entryId: args.entryId,
          status: args.status,
        });
      },
    }),

    setEntryUpvote: mutationGeneric({
      args: { entryId: v.string(), desiredState: v.boolean() },
      returns: v.object({ active: v.boolean(), upvoteCount: v.number() }),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.entries.setUpvote, {
          actorId: actor.id,
          entryId: args.entryId,
          desiredState: args.desiredState,
        });
      },
    }),

    listComments: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        entryId: v.string(),
        parentCommentId: v.optional(v.string()),
        sort: v.optional(commentSortValidator),
      },
      returns: paginationResultValidator(publicCommentValidator),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.comments.list, {
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.comments.maxPageSize,
          ),
          entryId: args.entryId,
          ...(args.parentCommentId === undefined
            ? {}
            : { parentCommentId: args.parentCommentId }),
          sort: args.sort ?? config.comments.defaultSort,
          ...actorIdFields(actor),
        });
      },
    }),

    createComment: mutationGeneric({
      args: {
        entryId: v.string(),
        parentCommentId: v.optional(v.string()),
        body: v.string(),
      },
      returns: v.string(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.comments.create, {
          actorId: actor.id,
          entryId: args.entryId,
          ...(args.parentCommentId === undefined
            ? {}
            : { parentCommentId: args.parentCommentId }),
          body: args.body,
          maxDepth: config.comments.maxDepth,
          maxCommentLength: config.limits.commentLength,
        });
      },
    }),

    updateComment: mutationGeneric({
      args: { commentId: v.string(), body: v.string() },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.comments.update, {
          actor,
          commentId: args.commentId,
          body: args.body,
          editableByAuthor: config.comments.editableByAuthor,
          maxCommentLength: config.limits.commentLength,
        });
      },
    }),

    deleteComment: mutationGeneric({
      args: { commentId: v.string() },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.comments.remove, {
          actor,
          commentId: args.commentId,
          deletableByAuthor: config.comments.deletableByAuthor,
        });
      },
    }),

    setCommentLike: mutationGeneric({
      args: { commentId: v.string(), desiredState: v.boolean() },
      returns: v.object({ active: v.boolean(), likeCount: v.number() }),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runMutation(component.comments.setLike, {
          actorId: actor.id,
          commentId: args.commentId,
          desiredState: args.desiredState,
        });
      },
    }),
  } satisfies Record<keyof FeedbackPublicApi, unknown>;
}
