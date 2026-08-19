# convex-feedback agent instructions

This package is the headless persistence and client integration layer.

- `src/component/schema.ts` is the only schema source of truth.
- Keep table count at three (`entries`, `comments`, `reactions`) unless a new durable concept cannot be represented without violating correctness.
- Keep `entries.ts` and `comments.ts` query paths index-backed and bounded.
- Never return `searchText` or `normalizedTitle` in the public entry model.
- Never expose deleted comment body text; serializer returns `null` for tombstones.
- Entry upvote/comment like mutations must remain idempotent (`desiredState: boolean`) so retries do not corrupt counts.
- Reaction count and reaction record changes must occur in the same Convex mutation.
- New replies increment the parent direct `replyCount` and the entry's total `commentCount` in the same transaction.
- Parent validation must confirm the comment belongs to the same entry before accepting a reply.
- `maxDepth` is write-time enforcement. Reads never recurse.
- Host configuration is passed through wrappers; do not create a configuration table.
- Keep authentication provider details out of the component. The wrapper passes `{ id, isModerator }`.
- Keep `args` and `returns` on every Convex function.
- Do not use `v.any()` in handwritten validators.
- Do not edit `_generated` except when replacing bootstrap output with actual Convex codegen output.
- Add a regression test for changes to voting, nesting, deletion, ordering, permissions, duplicate detection, or counters.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
