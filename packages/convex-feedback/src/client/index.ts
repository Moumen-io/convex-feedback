import {
  mutationGeneric,
  paginationOptsValidator,
  paginationResultValidator,
  queryGeneric,
  type Auth,
  type DefaultFunctionArgs,
  type FunctionReference,
  type GenericDataModel,
  type GenericMutationCtx,
  type PaginationOptions,
  type RegisteredMutation,
  type RegisteredQuery,
} from "convex/server";
import {
  ConvexError,
  v,
  type Infer,
  type Validator,
  type Value,
  type VUnion,
} from "convex/values";

import type { ComponentApi } from "../component/_generated/component.js";
import {
  adminEntryValidator,
  activityCommentValidator,
  activityEntryValidator,
  commentSortValidator,
  entryKindValidator,
  entryPriorityValidator,
  entrySortValidator,
  entryStatusFilterValidator,
  entryStatusValidator,
  feedbackMetadataValidator,
  publicCommentValidator,
  publicEntryValidator,
  feedbackReactionValidator,
  roadmapItemValidator,
  roadmapStatusValidator,
  similarEntriesValidator,
  actorIsAdmin,
  type EntryKind,
  type EntryStatus,
  type FeedbackActor,
  type FeedbackMetadata,
} from "../component/model.js";
import type { FeedbackPublicApi } from "./api.js";
import {
  createFeedbackConfig,
  type FeedbackConfigOverrides,
} from "./config.js";
import { stripActivityEntryContext } from "../component/helpers.js";

export type {
  AdminFeedbackEntry,
  FeedbackActivityComment,
  FeedbackActivityEntry,
  FeedbackActivityEntryWithContext,
  FeedbackCommentReactionTarget,
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
  FeedbackEntryReactionTarget,
  FeedbackReaction,
  RoadmapItem,
  RoadmapStatus,
  SimilarEntriesResult,
} from "../component/model.js";
export type {
  AdminListEntriesArgs,
  AdminSearchEntriesArgs,
  CreateCommentArgs,
  CreateEntryArgs,
  DeleteEntryArgs,
  DeleteCommentArgs,
  DetachFeedbackFromRoadmapArgs,
  FindSimilarEntriesArgs,
  GetEntryArgs,
  GetRoadmapItemArgs,
  ListCommentsArgs,
  ListEntriesArgs,
  ListUserCommentsArgs,
  ListUserEntriesArgs,
  ListUserReactionsArgs,
  ListRoadmapArgs,
  ListRoadmapFeedbackArgs,
  SearchEntriesArgs,
  SetCommentLikeArgs,
  SetEntryPriorityArgs,
  SetEntryStatusArgs,
  SetEntryUpvoteArgs,
  UpdateCommentArgs,
  UpdateEntryArgs,
  FeedbackPublicApi,
} from "./api.js";
export {
  createFeedbackConfig,
  defaultFeedbackConfig,
  type FeedbackConfig,
  type FeedbackConfigOverrides,
} from "./config.js";

/**
 * Minimal host context exposed to the actor resolver.
 *
 * The feedback component itself does not read host authentication. Use
 * `auth` to resolve the current host identity into a `FeedbackActor`.
 */
export interface FeedbackAuthContext {
  /** Host Convex authentication interface for the current request. */
  auth: Auth;
}

/**
 * Minimal host mutation context passed to a feedback rate limiter.
 *
 * This provides the nested function calls needed by Convex rate-limiter
 * helpers without coupling limiters to the host application's data model.
 */
export type FeedbackRateLimitContext = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

/**
 * A host-defined rate limiter keyed by the resolved feedback actor ID.
 *
 * In the default `"throw"` mode, return `undefined` when allowed and throw when
 * rejected. In `"return"` mode, return `undefined` when allowed or a value
 * matching the configured `returns` validator when rejected. `null` is never
 * a valid return-mode result.
 *
 * @typeParam Result Rejection value used only by non-throwing limiters.
 */
export type FeedbackRateLimiter<Result = void> = (
  ctx: FeedbackRateLimitContext,
  key: string,
) => Promise<Result | undefined>;

/**
 * Rate limiter hooks shared by related feedback mutations.
 *
 * @typeParam Result Rejection value used only in `"return"` mode.
 */
export interface FeedbackRateLimiters<Result = void> {
  /** Applied when creating an entry. */
  createEntry?: FeedbackRateLimiter<Result>;

  /** Applied when creating a comment or reply. */
  createComment?: FeedbackRateLimiter<Result>;

  /** Applied to entry edits, status changes, comment edits, and deletion. */
  editContent?: FeedbackRateLimiter<Result>;

  /** Applied to entry upvotes and comment likes. */
  reactions?: FeedbackRateLimiter<Result>;
}

/** Configuration for the default behavior, where limiters reject by throwing. */
export interface ThrowingFeedbackRateLimitConfig {
  /**
   * Configures limiter functions to reject requests by throwing.
   *
   * This is the default when `behavior` is omitted.
   */
  behavior?: "throw";

  /**
   * Whether all configured limiter groups apply to admins.
   *
   * @default false
   */
  limitAdmins?: boolean;

  /** @deprecated Use `limitAdmins`. */
  limitModerators?: boolean;

  /** Not accepted in throwing mode; select `"return"` to provide a validator. */
  returns?: never;
}

/**
 * A required, non-optional Convex validator for a non-null rate-limit
 * rejection.
 */
export type FeedbackRateLimitReturnValidator = Validator<
  Exclude<Value, null>,
  "required",
  string
>;

type FeedbackFunctionReturnValidator = Validator<Value, "required", string>;

/**
 * Return behavior: a defined limiter result short-circuits the mutation.
 *
 * @typeParam ReturnsValidator Validator for the value returned on rejection.
 */
export interface ReturningFeedbackRateLimitConfig<
  ReturnsValidator extends FeedbackRateLimitReturnValidator,
> {
  /** Configures limiter functions to return rejected requests to the client. */
  behavior: "return";

  /**
   * Convex validator for the non-null rejection value returned by a limiter.
   *
   * This field is required when `behavior` is `"return"` and may not accept
   * `null`. Its inferred value type is added to the result type of every
   * exposed feedback mutation.
   */
  returns: ReturnsValidator;

  /**
   * Whether all configured limiter groups apply to admins.
   *
   * @default false
   */
  limitAdmins?: boolean;

  /** @deprecated Use `limitAdmins`. */
  limitModerators?: boolean;
}

/**
 * Configuration for feedback rate-limit rejection behavior.
 *
 * Without a validator, this resolves to throwing behavior. Supplying a
 * validator requires `behavior: "return"` and the same validator in `returns`.
 *
 * @typeParam ReturnsValidator Validator for a non-throwing rejection value.
 */
export type FeedbackRateLimitConfig<
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined =
    undefined,
> = ReturnsValidator extends FeedbackRateLimitReturnValidator
  ? ReturningFeedbackRateLimitConfig<ReturnsValidator>
  : ThrowingFeedbackRateLimitConfig;

type RateLimitResult<
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined,
> = ReturnsValidator extends FeedbackRateLimitReturnValidator
  ? Infer<ReturnsValidator>
  : never;

type RateLimiterResult<
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined,
> = ReturnsValidator extends FeedbackRateLimitReturnValidator
  ? Infer<ReturnsValidator>
  : void;

/** Full host mutation context supplied to every lifecycle callback. */
export type FeedbackMutationContext = GenericMutationCtx<GenericDataModel>;

/**
 * Readonly entry creation event passed after auth/rate limiting and before any
 * component work. Return a {@link FeedbackEntryCreatePatch} to transform only
 * the supported fields; mutating `event.input` is neither supported nor used.
 */
export interface FeedbackEntryBeforeCreateEvent {
  readonly actor: Readonly<FeedbackActor>;
  readonly input: {
    readonly kind: EntryKind;
    readonly title: string;
    readonly body: string;
    readonly metadata?: Readonly<{
      standard?: Readonly<Record<string, string | number | boolean>>;
      additional?: Readonly<Record<string, string | number | boolean>>;
    }>;
  };
}

/**
 * Explicit entry creation transformations. Omitted fields retain the original
 * mutation arguments, and all returned values still undergo component
 * validation. Actor identity, IDs, and configured defaults cannot be changed.
 */
export interface FeedbackEntryCreatePatch {
  kind?: EntryKind;
  title?: string;
  body?: string;
  metadata?: FeedbackMetadata;
}

/**
 * Readonly comment creation event passed after auth/rate limiting and before
 * component work. `entryId` and `parentCommentId` are immutable relationship
 * fields; only an explicitly returned `body` patch is applied.
 */
export interface FeedbackCommentBeforeCreateEvent {
  readonly actor: Readonly<FeedbackActor>;
  readonly input: {
    readonly entryId: string;
    readonly parentCommentId?: string;
    readonly body: string;
  };
}

/**
 * Explicit comment creation transformation. Only `body` is supported and the
 * transformed value still undergoes length and permission validation.
 */
export interface FeedbackCommentCreatePatch {
  body?: string;
}

/**
 * Helpers supplied to before-create callbacks. `reject(value)` is the only
 * exception translated by callback rejection configuration: it throws a
 * `ConvexError` by default or returns the validated value in return mode.
 * Unexpected callback errors always propagate normally.
 */
export interface FeedbackCallbackHelpers<Rejection = Value> {
  reject: (value: Rejection) => never;
}

type MaybePromise<ValueType> = ValueType | Promise<ValueType>;

/**
 * Runs after actor resolution and rate limiting, before the component entry
 * mutation. It is awaited and may return an explicit creation patch or call
 * `reject()`; it cannot replace normal component validation.
 */
export type FeedbackEntryBeforeCreateCallback<Rejection = Value> = (
  ctx: FeedbackMutationContext,
  event: FeedbackEntryBeforeCreateEvent,
  helpers: FeedbackCallbackHelpers<Rejection>,
) => MaybePromise<FeedbackEntryCreatePatch | undefined>;

/** Sanitized persisted entry passed to `entries.afterCreate`. */
export interface FeedbackEntryAfterCreateEvent {
  readonly actor: FeedbackActor;
  readonly entry: {
    readonly id: string;
    readonly actorId: string;
    readonly kind: EntryKind;
    readonly status: EntryStatus;
    readonly title: string;
    readonly body: string;
    readonly metadata?: FeedbackMetadata;
    readonly upvoteCount: number;
    readonly commentCount: number;
  };
}

/**
 * Runs exactly once after successful component entry creation and is awaited
 * in the same host mutation. An uncaught error rolls back creation. Rich entry
 * context is requested from the component only when this callback is set.
 */
export type FeedbackEntryAfterCreateCallback = (
  ctx: FeedbackMutationContext,
  event: FeedbackEntryAfterCreateEvent,
) => MaybePromise<void>;

/**
 * Runs after actor resolution and rate limiting, before the component comment
 * mutation. It is awaited and may transform only `body` or call `reject()`.
 */
export type FeedbackCommentBeforeCreateCallback<Rejection = Value> = (
  ctx: FeedbackMutationContext,
  event: FeedbackCommentBeforeCreateEvent,
  helpers: FeedbackCallbackHelpers<Rejection>,
) => MaybePromise<FeedbackCommentCreatePatch | undefined>;

/** Persisted comment, entry, and optional parent context passed after creation. */
export interface FeedbackCommentAfterCreateEvent {
  readonly actor: FeedbackActor;
  readonly comment: {
    readonly id: string;
    readonly actorId: string;
    readonly entryId: string;
    readonly parentCommentId?: string;
    readonly body: string;
    readonly depth: number;
  };
  readonly entry: {
    readonly id: string;
    readonly actorId: string;
    readonly kind: EntryKind;
    readonly status: EntryStatus;
    readonly title: string;
  };
  readonly parentComment?: {
    readonly id: string;
    readonly actorId: string;
  };
}

/**
 * Runs exactly once after successful component comment creation and is awaited
 * in the same host mutation. An uncaught error rolls back creation. Rich
 * comment/entry/parent context is requested only when this callback is set.
 */
export type FeedbackCommentAfterCreateCallback = (
  ctx: FeedbackMutationContext,
  event: FeedbackCommentAfterCreateEvent,
) => MaybePromise<void>;

interface FeedbackReactionChangeBase {
  transition: "added" | "removed";
  active: boolean;
  previousCount: number;
  count: number;
  actor: FeedbackActor;
}

/**
 * Discriminated reaction transition. Events exist only for real state changes:
 * `added` is false→true and `removed` is true→false. `previousCount` is the
 * persisted count immediately before the change and `count` is the final one.
 * Comment-like events intentionally use comment context without reading or
 * serializing the parent entry.
 */
export type FeedbackReactionChangeEvent =
  | (FeedbackReactionChangeBase & {
      type: "entry_upvote";
      entry: {
        id: string;
        actorId: string;
        kind: EntryKind;
        status: EntryStatus;
        title: string;
      };
    })
  | (FeedbackReactionChangeBase & {
      type: "comment_like";
      comment: {
        id: string;
        actorId: string;
        entryId: string;
        parentCommentId?: string;
        body: string;
      };
    });

/**
 * Runs after a successful reaction mutation only for an actual transition and
 * is awaited in the same transaction, so uncaught errors roll back the change.
 * Extra reaction context is requested only when this callback is configured.
 */
export type FeedbackReactionAfterChangeCallback = (
  ctx: FeedbackMutationContext,
  event: FeedbackReactionChangeEvent,
) => MaybePromise<void>;

/** Convex validator for an explicit callback rejection returned to the client. */
export type FeedbackCallbackReturnValidator = Validator<
  Value,
  "required",
  string
>;

/** Default mode: `reject(value)` throws a `ConvexError`. */
export interface ThrowingFeedbackCallbackRejectionConfig {
  behavior?: "throw";
  returns?: never;
}

/** Return mode: `reject(value)` short-circuits with a validated client result. */
export interface ReturningFeedbackCallbackRejectionConfig<
  ReturnsValidator extends FeedbackCallbackReturnValidator,
> {
  behavior: "return";
  returns: ReturnsValidator;
}

/**
 * Controls only explicit `reject()` calls from entry/comment before callbacks.
 * Runtime/programming errors are never converted. Return-mode inference is
 * added only to `createEntry` and `createComment`.
 */
export type FeedbackCallbackRejectionConfig<
  ReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
> = ReturnsValidator extends FeedbackCallbackReturnValidator
  ? ReturningFeedbackCallbackRejectionConfig<ReturnsValidator>
  : ThrowingFeedbackCallbackRejectionConfig;

type CallbackRejectionValue<
  ReturnsValidator extends FeedbackCallbackReturnValidator | undefined,
> = ReturnsValidator extends FeedbackCallbackReturnValidator
  ? Infer<ReturnsValidator>
  : Value;

interface FeedbackCallbackScopes<Rejection> {
  entries?: {
    beforeCreate?: FeedbackEntryBeforeCreateCallback<Rejection>;
    afterCreate?: FeedbackEntryAfterCreateCallback;
  };
  comments?: {
    beforeCreate?: FeedbackCommentBeforeCreateCallback<Rejection>;
    afterCreate?: FeedbackCommentAfterCreateCallback;
  };
  reactions?: {
    afterChange?: FeedbackReactionAfterChangeCallback;
  };
}

/**
 * Optional host lifecycle callbacks grouped by domain. Creation order is
 * actor/auth → rate limiter → beforeCreate → component mutation → afterCreate.
 * Reaction order is actor/auth → rate limiter → component mutation →
 * afterChange for a real transition. All callbacks are awaited in the host
 * mutation; uncaught failures roll back its component writes. Component
 * callback context and any associated work are requested only for the relevant
 * configured after-callback.
 */
export type FeedbackCallbacks<
  ReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
> = FeedbackCallbackScopes<CallbackRejectionValue<ReturnsValidator>> &
  (ReturnsValidator extends FeedbackCallbackReturnValidator
    ? {
        rejection: ReturningFeedbackCallbackRejectionConfig<ReturnsValidator>;
      }
    : { rejection?: ThrowingFeedbackCallbackRejectionConfig });

type RegisteredFeedbackFunction<Function> =
  Function extends FunctionReference<
    "mutation",
    "public",
    infer Args,
    infer Result
  >
    ? Args extends DefaultFunctionArgs
      ? RegisteredMutation<"public", Args, Promise<Result>>
      : never
    : Function extends FunctionReference<
          "query",
          "public",
          infer Args,
          infer Result
        >
      ? Args extends DefaultFunctionArgs
        ? RegisteredQuery<"public", Args, Promise<Result>>
        : never
      : never;

type ExposedFeedbackApi<RateLimitResult, CallbackRejectionResult> = {
  [
    FunctionName in keyof FeedbackPublicApi<
      string | undefined,
      RateLimitResult,
      CallbackRejectionResult
    >
  ]: RegisteredFeedbackFunction<
    FeedbackPublicApi<
      string | undefined,
      RateLimitResult,
      CallbackRejectionResult
    >[FunctionName]
  >;
};

interface ExposeFeedbackOptionsBase {
  /**
   * Resolves the current request into a stable feedback actor.
   *
   * Return `null` for an unauthenticated request. Read-only queries may still
   * execute, but mutations requiring an actor will reject unauthenticated
   * callers.
   */
  actor: (ctx: FeedbackAuthContext) => Promise<FeedbackActor | null>;

  /**
   * Optional component behavior overrides.
   *
   * Unspecified values use `defaultFeedbackConfig`.
   */
  config?: FeedbackConfigOverrides;
}

type FeedbackCallbackOptions<
  ReturnsValidator extends FeedbackCallbackReturnValidator | undefined,
> = ReturnsValidator extends FeedbackCallbackReturnValidator
  ? {
      /** Host lifecycle callbacks with validated return-mode rejection. */
      callbacks: FeedbackCallbacks<ReturnsValidator>;
    }
  : {
      /** Optional host lifecycle callbacks; explicit rejection throws by default. */
      callbacks?: FeedbackCallbacks;
    };

/**
 * Exposure options with throwing rate limits and optional lifecycle callbacks.
 * Callback execution/rollback semantics are documented by {@link FeedbackCallbacks}.
 */
export type ThrowingExposeFeedbackOptions<
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
> = Omit<ExposeFeedbackOptionsBase, "config"> & {
  /** Optional throwing rate limiters for the component's mutation groups. */
  rateLimiters?: FeedbackRateLimiters;

  /** Optional component behavior and throwing rate-limit overrides. */
  config?: FeedbackConfigOverrides & {
    /**
     * Controls throwing behavior and the admin exemption.
     *
     * Omit this object to use `behavior: "throw"` and
     * `limitAdmins: false`.
     */
    rateLimiting?: FeedbackRateLimitConfig;
  };
} & FeedbackCallbackOptions<CallbackReturnsValidator>;

/**
 * Exposure options for validated rate-limit returns plus optional lifecycle
 * callbacks and independently inferred callback-rejection behavior.
 */
export type ReturningExposeFeedbackOptions<
  ReturnsValidator extends FeedbackRateLimitReturnValidator,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
> = Omit<ExposeFeedbackOptionsBase, "config"> & {
  /**
   * Optional returning rate limiters for the component's mutation groups.
   *
   * A limiter returns `undefined` to allow the request. Any other returned
   * value must match `config.rateLimiting.returns` and prevents the component
   * mutation from running.
   */
  rateLimiters?: FeedbackRateLimiters<NoInfer<Infer<ReturnsValidator>>>;

  /** Component behavior plus the required non-throwing limiter configuration. */
  config: FeedbackConfigOverrides & {
    /**
     * Configures non-throwing rejection behavior.
     *
     * Both `behavior: "return"` and a `returns` Convex validator are required.
     */
    rateLimiting: FeedbackRateLimitConfig<ReturnsValidator>;
  };
} & FeedbackCallbackOptions<CallbackReturnsValidator>;

/**
 * Configuration used when exposing feedback functions from the host app.
 *
 * When `ReturnsValidator` is omitted, limiter functions use throwing behavior.
 * Supplying a validator selects return behavior and adds its inferred value to
 * the exposed mutation result types. `CallbackReturnsValidator` independently
 * controls explicit before-callback rejection inference.
 */
export type ExposeFeedbackOptions<
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined =
    undefined,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
> = ReturnsValidator extends FeedbackRateLimitReturnValidator
  ? ReturningExposeFeedbackOptions<ReturnsValidator, CallbackReturnsValidator>
  : ThrowingExposeFeedbackOptions<CallbackReturnsValidator>;

function requireActor(actor: FeedbackActor | null): FeedbackActor {
  if (actor === null) {
    throw new ConvexError("Authentication is required.");
  }
  return actor;
}

function requireAdmin(actor: FeedbackActor): void {
  if (!actorIsAdmin(actor)) {
    throw new ConvexError("Admin permissions are required.");
  }
}

type RateLimitedReturnsValidator<
  Base extends FeedbackFunctionReturnValidator,
  Limit extends FeedbackRateLimitReturnValidator | undefined,
> = Limit extends FeedbackRateLimitReturnValidator
  ? VUnion<Infer<Base> | Infer<Limit>, [Base, Limit]>
  : Base;

function rateLimitedReturns<
  Base extends FeedbackFunctionReturnValidator,
  Limit extends FeedbackRateLimitReturnValidator | undefined,
>(base: Base, limit: Limit): RateLimitedReturnsValidator<Base, Limit> {
  return (
    limit === undefined ? base : v.union(base, limit)
  ) as RateLimitedReturnsValidator<Base, Limit>;
}

type CallbackLimitedReturnsValidator<
  Base extends FeedbackFunctionReturnValidator,
  Rejection extends FeedbackCallbackReturnValidator | undefined,
> = Rejection extends FeedbackCallbackReturnValidator
  ? VUnion<Infer<Base> | Infer<Rejection>, [Base, Rejection]>
  : Base;

function callbackLimitedReturns<
  Base extends FeedbackFunctionReturnValidator,
  Rejection extends FeedbackCallbackReturnValidator | undefined,
>(
  base: Base,
  rejection: Rejection,
): CallbackLimitedReturnsValidator<Base, Rejection> {
  return (
    rejection === undefined ? base : v.union(base, rejection)
  ) as CallbackLimitedReturnsValidator<Base, Rejection>;
}

type CallbackResult<
  ReturnsValidator extends FeedbackCallbackReturnValidator | undefined,
> = ReturnsValidator extends FeedbackCallbackReturnValidator
  ? Infer<ReturnsValidator>
  : never;

class ExplicitFeedbackCallbackRejection extends Error {
  constructor(readonly value: Value) {
    super("Feedback callback rejected creation.");
    this.name = "ExplicitFeedbackCallbackRejection";
  }
}

async function runBeforeCreate<Patch, Event, Rejection extends Value>(
  ctx: FeedbackMutationContext,
  event: Event,
  callback:
    | ((
        ctx: FeedbackMutationContext,
        event: Event,
        helpers: FeedbackCallbackHelpers<Rejection>,
      ) => MaybePromise<Patch | undefined>)
    | undefined,
  rejectionConfig:
    | ThrowingFeedbackCallbackRejectionConfig
    | ReturningFeedbackCallbackRejectionConfig<FeedbackCallbackReturnValidator>
    | undefined,
): Promise<
  | { rejected: false; patch: Patch | undefined }
  | { rejected: true; value: Rejection }
> {
  if (callback === undefined) {
    return { rejected: false, patch: undefined };
  }

  try {
    const patch = await callback(ctx, event, {
      reject: (value) => {
        throw new ExplicitFeedbackCallbackRejection(value);
      },
    });
    return { rejected: false, patch };
  } catch (error) {
    if (!(error instanceof ExplicitFeedbackCallbackRejection)) {
      throw error;
    }
    if (rejectionConfig?.behavior === "return") {
      return { rejected: true, value: error.value as Rejection };
    }
    throw new ConvexError(error.value);
  }
}

async function applyRateLimiter<
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined,
>(
  ctx: FeedbackRateLimitContext,
  actor: FeedbackActor,
  limiter: FeedbackRateLimiter<RateLimiterResult<ReturnsValidator>> | undefined,
  rateLimitConfig:
    | ThrowingFeedbackRateLimitConfig
    | ReturningFeedbackRateLimitConfig<FeedbackRateLimitReturnValidator>
    | undefined,
): Promise<RateLimitResult<ReturnsValidator> | undefined> {
  const limitAdmins =
    rateLimitConfig?.limitAdmins ?? rateLimitConfig?.limitModerators ?? false;
  if (limiter === undefined || (actorIsAdmin(actor) && !limitAdmins)) {
    return undefined;
  }

  const result = await limiter(ctx, actor.id);
  if (rateLimitConfig?.behavior !== "return" || result === undefined) {
    return undefined;
  }
  if (result === null) {
    throw new ConvexError(
      "A return-mode feedback rate limiter returned null. Return undefined to allow the request or a non-null value matching config.rateLimiting.returns to reject it.",
    );
  }
  return result as RateLimitResult<ReturnsValidator>;
}

function asRateLimitContext(ctx: unknown): FeedbackRateLimitContext {
  return ctx as FeedbackRateLimitContext;
}

function asMutationContext(ctx: unknown): FeedbackMutationContext {
  return ctx as FeedbackMutationContext;
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

function cloneFeedbackMetadata(
  metadata: FeedbackMetadata | undefined,
): FeedbackMetadata | undefined {
  if (metadata === undefined) return undefined;
  return {
    ...(metadata.standard === undefined
      ? {}
      : { standard: { ...metadata.standard } }),
    ...(metadata.additional === undefined
      ? {}
      : { additional: { ...metadata.additional } }),
  };
}

function buildFeedbackApi<
  Name extends string | undefined,
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined =
    undefined,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator | undefined =
    undefined,
>(
  component: ComponentApi<Name>,
  options: ExposeFeedbackOptions<ReturnsValidator, CallbackReturnsValidator>,
) {
  const config = createFeedbackConfig(options.config);
  const rateLimitConfig = options.config?.rateLimiting;
  const rateLimitReturnValidator =
    rateLimitConfig?.behavior === "return"
      ? rateLimitConfig.returns
      : undefined;
  const callbackRejectionConfig = options.callbacks?.rejection;
  const callbackReturnValidator =
    callbackRejectionConfig?.behavior === "return"
      ? callbackRejectionConfig.returns
      : undefined;

  const idReturns = rateLimitedReturns(v.string(), rateLimitReturnValidator);
  const createIdReturns = callbackLimitedReturns(
    idReturns,
    callbackReturnValidator,
  );
  const nullReturns = rateLimitedReturns(v.null(), rateLimitReturnValidator);
  const entryUpvoteReturns = rateLimitedReturns(
    v.object({ active: v.boolean(), upvoteCount: v.number() }),
    rateLimitReturnValidator,
  );
  const commentLikeReturns = rateLimitedReturns(
    v.object({ active: v.boolean(), likeCount: v.number() }),
    rateLimitReturnValidator,
  );
  const numberReturns = rateLimitedReturns(
    v.number(),
    rateLimitReturnValidator,
  );

  const requireAdminActor = async (ctx: FeedbackAuthContext) => {
    const actor = requireActor(await options.actor(ctx));
    requireAdmin(actor);
    return actor;
  };

  const applyAdminEditLimit = async (
    ctx: FeedbackRateLimitContext,
    actor: FeedbackActor,
  ) =>
    await applyRateLimiter(
      ctx,
      actor,
      options.rateLimiters?.editContent,
      rateLimitConfig,
    );

  return {
    isAdmin: queryGeneric({
      args: {},
      returns: v.boolean(),
      handler: async (ctx) => {
        const actor = await options.actor(ctx);
        return actor !== null && actorIsAdmin(actor);
      },
    }),

    isAuthenticated: queryGeneric({
      args: {},
      returns: v.boolean(),
      handler: async (ctx) => (await options.actor(ctx)) !== null,
    }),

    listEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        kinds: v.optional(v.array(entryKindValidator)),
        status: v.optional(entryStatusValidator),
        statusFilter: v.optional(entryStatusFilterValidator),
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
          ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.statusFilter === undefined
            ? {}
            : { statusFilter: args.statusFilter }),
          sort: args.sort ?? config.entries.defaultSort,
          ...actorIdFields(actor),
        });
      },
    }),

    listUserEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
      },
      returns: paginationResultValidator(activityEntryValidator),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const result = await ctx.runQuery(component.entries.listByActor, {
          actorId: actor.id,
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
          includeAdminContext: false,
        });

        return {
          ...result,
          page: result.page.map(stripActivityEntryContext),
        };
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
          ...(actor !== null && actorIsAdmin(actor)
            ? { viewerIsAdmin: true }
            : {}),
        });
      },
    }),

    searchEntries: queryGeneric({
      args: {
        searchQuery: v.string(),
        kinds: v.optional(v.array(entryKindValidator)),
        status: v.optional(entryStatusValidator),
        statusFilter: v.optional(entryStatusFilterValidator),
        limit: v.optional(v.number()),
      },
      returns: v.array(publicEntryValidator),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);

        return await ctx.runQuery(component.entries.search, {
          searchQuery: args.searchQuery,
          ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.statusFilter === undefined
            ? {}
            : { statusFilter: args.statusFilter }),
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
        metadata: v.optional(feedbackMetadataValidator),
      },
      returns: createIdReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.createEntry,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;

        const beforeCreate = options.callbacks?.entries?.beforeCreate;
        let patch: FeedbackEntryCreatePatch | undefined;
        if (beforeCreate !== undefined) {
          const callbackInput: FeedbackEntryBeforeCreateEvent["input"] = {
            kind: args.kind,
            title: args.title,
            body: args.body,
            ...(args.metadata === undefined
              ? {}
              : { metadata: cloneFeedbackMetadata(args.metadata) }),
          };
          const before = await runBeforeCreate(
            asMutationContext(ctx),
            { actor: { ...actor }, input: callbackInput },
            beforeCreate,
            callbackRejectionConfig,
          );
          if (before.rejected) {
            return before.value as CallbackResult<CallbackReturnsValidator>;
          }
          patch = before.patch;
        }
        const metadata =
          patch !== undefined &&
          Object.prototype.hasOwnProperty.call(patch, "metadata")
            ? patch.metadata
            : args.metadata;
        const afterCreate = options.callbacks?.entries?.afterCreate;
        const result = await ctx.runMutation(component.entries.create, {
          actorId: actor.id,
          kind: patch?.kind ?? args.kind,
          title: patch?.title ?? args.title,
          body: patch?.body ?? args.body,
          defaultStatus: config.entries.defaultStatus,
          enabledKinds: [...config.entries.enabledKinds],
          maxTitleLength: config.limits.titleLength,
          maxBodyLength: config.limits.bodyLength,
          ...(metadata === undefined ? {} : { metadata }),
          includeCallbackContext: afterCreate !== undefined,
        });
        if (afterCreate !== undefined) {
          if (!("entry" in result)) {
            throw new ConvexError("Entry callback context was not returned.");
          }
          await afterCreate(asMutationContext(ctx), {
            actor,
            entry: result.entry,
          });
        }
        return result.id;
      },
    }),

    updateEntry: mutationGeneric({
      args: {
        entryId: v.string(),
        kind: v.optional(entryKindValidator),
        title: v.string(),
        body: v.string(),
      },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.editContent,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.entries.update, {
          actor,
          entryId: args.entryId,
          ...(args.kind === undefined ? {} : { kind: args.kind }),
          title: args.title,
          body: args.body,
          editableByAuthor: config.entries.editableByAuthor,
          maxTitleLength: config.limits.titleLength,
          maxBodyLength: config.limits.bodyLength,
        });
      },
    }),

    deleteEntry: mutationGeneric({
      args: { entryId: v.string() },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.entries.remove, {
          actor,
          entryId: args.entryId,
        });
      },
    }),

    setEntryStatus: mutationGeneric({
      args: { entryId: v.string(), status: entryStatusValidator },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        requireAdmin(actor);
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.editContent,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.entries.setStatus, {
          actor,
          entryId: args.entryId,
          status: args.status,
        });
      },
    }),

    adminListEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        kinds: v.optional(v.array(entryKindValidator)),
        status: v.optional(entryStatusValidator),
        priority: v.optional(entryPriorityValidator),
      },
      returns: paginationResultValidator(adminEntryValidator),
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        return await ctx.runQuery(component.admin.listEntries, {
          ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.priority === undefined ? {} : { priority: args.priority }),
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
          viewerActorId: actor.id,
        });
      },
    }),

    adminGetEntry: queryGeneric({
      args: { entryId: v.string() },
      returns: v.union(adminEntryValidator, v.null()),
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        return await ctx.runQuery(component.admin.getEntry, {
          entryId: args.entryId,
          viewerActorId: actor.id,
        });
      },
    }),

    adminSearchEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        searchQuery: v.string(),
        kinds: v.optional(v.array(entryKindValidator)),
        status: v.optional(entryStatusValidator),
        priority: v.optional(entryPriorityValidator),
      },
      returns: paginationResultValidator(adminEntryValidator),
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        return await ctx.runQuery(component.admin.searchEntries, {
          searchQuery: args.searchQuery,
          ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.priority === undefined ? {} : { priority: args.priority }),
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
          viewerActorId: actor.id,
        });
      },
    }),

    setEntryPriority: mutationGeneric({
      args: {
        entryId: v.string(),
        priority: v.union(entryPriorityValidator, v.null()),
      },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.entries.setPriority, {
          actor,
          entryId: args.entryId,
          priority: args.priority,
        });
      },
    }),

    setEntryUpvote: mutationGeneric({
      args: { entryId: v.string(), desiredState: v.boolean() },
      returns: entryUpvoteReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.reactions,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
        const afterChange = options.callbacks?.reactions?.afterChange;
        const result = await ctx.runMutation(component.entries.setUpvote, {
          actorId: actor.id,
          entryId: args.entryId,
          desiredState: args.desiredState,
          includeCallbackContext: afterChange !== undefined,
        });
        if (
          "changed" in result &&
          result.changed &&
          afterChange !== undefined
        ) {
          await afterChange(asMutationContext(ctx), {
            type: "entry_upvote",
            transition: result.transition,
            active: result.active,
            previousCount: result.previousCount,
            count: result.count,
            actor,
            entry: result.entry,
          });
        }
        return "upvoteCount" in result
          ? result
          : { active: result.active, upvoteCount: result.count };
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

    listUserComments: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
      },
      returns: paginationResultValidator(activityCommentValidator),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runQuery(component.comments.listByActor, {
          actorId: actor.id,
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.comments.maxPageSize,
          ),
        });
      },
    }),

    createComment: mutationGeneric({
      args: {
        entryId: v.string(),
        parentCommentId: v.optional(v.string()),
        body: v.string(),
      },
      returns: createIdReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.createComment,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;

        const beforeCreate = options.callbacks?.comments?.beforeCreate;
        let patch: FeedbackCommentCreatePatch | undefined;
        if (beforeCreate !== undefined) {
          const callbackInput: FeedbackCommentBeforeCreateEvent["input"] = {
            entryId: args.entryId,
            ...(args.parentCommentId === undefined
              ? {}
              : { parentCommentId: args.parentCommentId }),
            body: args.body,
          };
          const before = await runBeforeCreate(
            asMutationContext(ctx),
            { actor: { ...actor }, input: callbackInput },
            beforeCreate,
            callbackRejectionConfig,
          );
          if (before.rejected) {
            return before.value as CallbackResult<CallbackReturnsValidator>;
          }
          patch = before.patch;
        }
        const afterCreate = options.callbacks?.comments?.afterCreate;
        const result = await ctx.runMutation(component.comments.create, {
          actorId: actor.id,
          entryId: args.entryId,
          ...(args.parentCommentId === undefined
            ? {}
            : { parentCommentId: args.parentCommentId }),
          body: patch?.body ?? args.body,
          maxDepth: config.comments.maxDepth,
          maxCommentLength: config.limits.commentLength,
          includeCallbackContext: afterCreate !== undefined,
        });
        if (afterCreate !== undefined) {
          if (!("comment" in result)) {
            throw new ConvexError("Comment callback context was not returned.");
          }
          await afterCreate(asMutationContext(ctx), {
            actor,
            comment: result.comment,
            entry: result.entry,
            ...(result.parentComment === undefined
              ? {}
              : { parentComment: result.parentComment }),
          });
        }
        return result.id;
      },
    }),

    updateComment: mutationGeneric({
      args: { commentId: v.string(), body: v.string() },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.editContent,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
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
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.editContent,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.comments.remove, {
          actor,
          commentId: args.commentId,
          deletableByAuthor: config.comments.deletableByAuthor,
        });
      },
    }),

    setCommentLike: mutationGeneric({
      args: { commentId: v.string(), desiredState: v.boolean() },
      returns: commentLikeReturns,
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        const limited = await applyRateLimiter(
          asRateLimitContext(ctx),
          actor,
          options.rateLimiters?.reactions,
          rateLimitConfig,
        );
        if (limited !== undefined) return limited;
        const afterChange = options.callbacks?.reactions?.afterChange;
        const result = await ctx.runMutation(component.comments.setLike, {
          actorId: actor.id,
          commentId: args.commentId,
          desiredState: args.desiredState,
          includeCallbackContext: afterChange !== undefined,
        });
        if (
          "changed" in result &&
          result.changed &&
          afterChange !== undefined
        ) {
          await afterChange(asMutationContext(ctx), {
            type: "comment_like",
            transition: result.transition,
            active: result.active,
            previousCount: result.previousCount,
            count: result.count,
            actor,
            comment: result.comment,
          });
        }
        return "likeCount" in result
          ? result
          : { active: result.active, likeCount: result.count };
      },
    }),

    listUserReactions: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
      },
      returns: paginationResultValidator(feedbackReactionValidator),
      handler: async (ctx, args) => {
        const actor = requireActor(await options.actor(ctx));
        return await ctx.runQuery(component.reactions.listByActor, {
          actorId: actor.id,
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
        });
      },
    }),

    listRoadmap: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(roadmapStatusValidator),
      },
      returns: paginationResultValidator(roadmapItemValidator),
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.roadmap.list, {
          ...args,
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
        });
      },
    }),

    getRoadmapItem: queryGeneric({
      args: { roadmapId: v.string() },
      returns: v.union(roadmapItemValidator, v.null()),
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.roadmap.get, args);
      },
    }),

    searchRoadmap: queryGeneric({
      args: { searchQuery: v.string(), limit: v.optional(v.number()) },
      returns: v.array(roadmapItemValidator),
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.roadmap.search, {
          searchQuery: args.searchQuery,
          limit: clampPositive(args.limit, 10, 50),
        });
      },
    }),

    createRoadmap: mutationGeneric({
      args: {
        title: v.string(),
        description: v.optional(v.string()),
        status: roadmapStatusValidator,
      },
      returns: idReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.create, {
          actor,
          ...args,
        });
      },
    }),

    createRoadmapForEntry: mutationGeneric({
      args: {
        title: v.string(),
        description: v.optional(v.string()),
        status: roadmapStatusValidator,
        entryId: v.string(),
      },
      returns: idReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.createForEntry, {
          actor,
          ...args,
        });
      },
    }),

    updateRoadmap: mutationGeneric({
      args: {
        roadmapId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
      },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.update, {
          actor,
          ...args,
        });
      },
    }),

    deleteRoadmap: mutationGeneric({
      args: { roadmapId: v.string() },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.remove, {
          actor,
          ...args,
        });
      },
    }),

    moveRoadmapItem: mutationGeneric({
      args: {
        roadmapId: v.string(),
        status: roadmapStatusValidator,
        previousItemId: v.optional(v.string()),
        nextItemId: v.optional(v.string()),
      },
      returns: numberReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.move, {
          actor,
          ...args,
        });
      },
    }),

    attachFeedbackToRoadmap: mutationGeneric({
      args: { roadmapId: v.string(), entryId: v.string() },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.attachFeedback, {
          actor,
          ...args,
        });
      },
    }),

    detachFeedbackFromRoadmap: mutationGeneric({
      args: { entryId: v.string() },
      returns: nullReturns,
      handler: async (ctx, args) => {
        const actor = await requireAdminActor(ctx);
        const limited = await applyAdminEditLimit(
          asRateLimitContext(ctx),
          actor,
        );
        if (limited !== undefined) return limited;
        return await ctx.runMutation(component.roadmap.detachFeedback, {
          actor,
          ...args,
        });
      },
    }),

    listRoadmapFeedback: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        roadmapId: v.string(),
      },
      returns: paginationResultValidator(publicEntryValidator),
      handler: async (ctx, args) => {
        const actor = await options.actor(ctx);
        return await ctx.runQuery(component.roadmap.listFeedback, {
          ...args,
          paginationOpts: clampPagination(
            args.paginationOpts,
            config.entries.maxPageSize,
          ),
          ...(actor === null ? {} : { viewerActorId: actor.id }),
        });
      },
    }),
  } satisfies Record<keyof FeedbackPublicApi, unknown>;
}

/**
 * Exposes the feedback component through host queries and mutations.
 *
 * Rate limiters use throwing behavior unless
 * `config.rateLimiting.behavior` is `"return"`. Return behavior requires a
 * `returns` validator and adds that validator's inferred type to every
 * mutation result.
 */
export function exposeFeedbackApi<
  Name extends string | undefined,
  RateReturnsValidator extends FeedbackRateLimitReturnValidator,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator,
>(
  component: ComponentApi<Name>,
  options: ReturningExposeFeedbackOptions<
    RateReturnsValidator,
    CallbackReturnsValidator
  >,
): ExposedFeedbackApi<
  Infer<RateReturnsValidator>,
  Infer<CallbackReturnsValidator>
>;

/** Exposes returning rate limits with throwing callback rejections. */
export function exposeFeedbackApi<
  Name extends string | undefined,
  RateReturnsValidator extends FeedbackRateLimitReturnValidator,
>(
  component: ComponentApi<Name>,
  options: ReturningExposeFeedbackOptions<RateReturnsValidator>,
): ExposedFeedbackApi<Infer<RateReturnsValidator>, never>;

/** Exposes throwing rate limits with returning callback rejections. */
export function exposeFeedbackApi<
  Name extends string | undefined,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator,
>(
  component: ComponentApi<Name>,
  options: ThrowingExposeFeedbackOptions<CallbackReturnsValidator>,
): ExposedFeedbackApi<never, Infer<CallbackReturnsValidator>>;

/** Exposes feedback using optional throwing rate limiters. */
export function exposeFeedbackApi<Name extends string | undefined>(
  component: ComponentApi<Name>,
  options: ThrowingExposeFeedbackOptions,
): ExposedFeedbackApi<never, never>;

export function exposeFeedbackApi<
  Name extends string | undefined,
  ReturnsValidator extends FeedbackRateLimitReturnValidator | undefined,
  CallbackReturnsValidator extends FeedbackCallbackReturnValidator | undefined,
>(
  component: ComponentApi<Name>,
  options: ExposeFeedbackOptions<ReturnsValidator, CallbackReturnsValidator>,
): ExposedFeedbackApi<
  RateLimitResult<ReturnsValidator>,
  CallbackResult<CallbackReturnsValidator>
> {
  return buildFeedbackApi(component, options);
}
