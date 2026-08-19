# convex-feedback

Headless Convex component for product feedback, feature requests, bug reports, entry upvotes, recursive discussions, comment likes, and duplicate suggestions.

## Data model

The component owns exactly three tables.

### `entries`

Stores the feedback body and list-query counters:

- `kind`: `feedback | feature_request | bug_report`
- `status`: `open | under_review | planned | in_progress | completed | closed`
- `actorId`, `title`, `body`
- `normalizedTitle`, `searchText`
- `upvoteCount`, `commentCount`
- optional `updatedAt`

`_creationTime` is used instead of a duplicate `createdAt` field.

### `comments`

Stores one recursive adjacency-list node per comment:

- `entryId`
- optional `parentCommentId`
- `actorId`, `depth`, `body`
- `likeCount`
- `replyCount` (direct children only)
- optional `updatedAt`, `deletedAt`

A deleted comment remains as a tombstone so descendants keep their place in the tree. Public serializers return `body: null` after deletion.

### `reactions`

A single sparse table stores both entry upvotes and comment likes. A record has either `entryId` or `commentId`, never both. Query-specific indexes enforce one reaction lookup per actor/target.

## Lazy comments

`listComments` accepts an optional `parentCommentId` and returns only direct children of that parent. Omitting `parentCommentId` returns top-level comments. Each level is independently paginated.

Default UI behavior is therefore:

```text
root comments query
  comment A
    click "View replies"
      direct replies query for A
        reply A1
          click "View replies"
            direct replies query for A1
```

`maxDepth` is enforced when a reply is created. The default host config is `5`.

## Ordering

Comments support three global server-side sorts:

- `top`: `likeCount DESC`, then Convex index `_creationTime DESC`
- `newest`: `_creationTime DESC`
- `oldest`: `_creationTime ASC`

All three are index-backed. Do not add an arbitrary server comparator: it cannot preserve correct cursor pagination without an index. UI clients may transform already-loaded comments locally.

Entries support `top` and `newest` with filter-specific indexes for kind/status combinations.

## Search and duplicates

The component stores one derived `searchText` (`title + body`) and uses a Convex search index. `searchEntries` returns full-text results. `findSimilarEntries` returns:

```ts
{
  exact: FeedbackEntry[];
  similar: FeedbackEntry[];
}
```

`exact` uses normalized title equality. `similar` uses full-text relevance and excludes exact matches. These are lexical suggestions, not semantic/AI duplicate claims.

## Static configuration

Configuration is host code, not a database table.

```ts
exposeFeedbackApi(components.feedback, {
  actor: resolveActor,
  config: {
    entries: {
      enabledKinds: ["feedback", "feature_request", "bug_report"],
      defaultStatus: "open",
      defaultSort: "top",
      maxPageSize: 50,
      editableByAuthor: true,
    },
    comments: {
      maxDepth: 5,
      maxPageSize: 50,
      defaultSort: "top",
      editableByAuthor: true,
      deletableByAuthor: true,
    },
    search: {
      duplicateSuggestions: true,
      duplicateSuggestionLimit: 5,
      defaultLimit: 20,
      maxLimit: 50,
    },
    limits: {
      titleLength: 160,
      bodyLength: 10000,
      commentLength: 5000,
    },
  },
});
```

All nested values are optional in overrides; defaults are merged by `createFeedbackConfig`.

## Authentication boundary

A Convex component is isolated from the host app. The host wrapper receives a resolver:

```ts
actor: async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  return { id: identity.subject, isModerator: false };
};
```

Reads can be anonymous. Writes call `requireActor`. Status changes require `isModerator: true`. Author edit/delete rules are still checked inside the component using the stable actor id passed by the host.

## Host-facing API

`exposeFeedbackApi` returns:

- `listEntries`
- `getEntry`
- `searchEntries`
- `findSimilarEntries`
- `createEntry`
- `updateEntry`
- `setEntryStatus`
- `setEntryUpvote`
- `listComments`
- `createComment`
- `updateComment`
- `deleteComment`
- `setCommentLike`

Export these from one of your host Convex modules so your generated host `api` can expose them to clients.

## React hooks

`convex-feedback/react` exports `createFeedbackHooks(api, options)`. It binds the generated host references once and returns hooks for every read/write operation. Client page sizes are configured there (`entryPageSize`, `commentPageSize`, and `replyPageSize`) while the host config enforces the hard maximum page sizes. The resolved sizes are also exposed as `hooks.pageSizes` for UI layers.

Pagination uses the `convex-helpers/react` pagination hook because component pagination uses the stream/paginator helper and needs `endCursor` stitching for reactive, gap-free pages.

## Testing

The package exports `convex-feedback/test`:

```ts
import feedbackTest from "convex-feedback/test";
import { convexTest } from "convex-test";

const t = convexTest();
feedbackTest.register(t, "feedback");
```

The repository tests cover idempotent entry upvotes, direct-child comment loading, max depth, idempotent comment likes/top ordering, exact duplicate normalization, and config merging.

## Generated files

The committed `_generated` files are starter/bootstrap output. After installing dependencies, regenerate them:

```bash
npm run codegen -w convex-feedback
```

Do not manually maintain generated API/data-model definitions.
