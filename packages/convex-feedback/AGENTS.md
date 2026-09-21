# convex-feedback agent instructions

This package is the headless persistence and client integration layer.

- `src/component/schema.ts` is the only schema source of truth.
- Keep the component schema minimal and domain-oriented. Add a table only for a durable concept or when it is required for correctness or scalability.
- Distinguish durable domain data from internal bookkeeping/state, and do not expose bookkeeping through public models.
- Keep `entries.ts`, `comments.ts`, `reactions.ts`, and roadmap query paths index-backed, bounded, and paginated.
- Never return `searchText` or `normalizedTitle` in the public entry model.
- Never expose deleted comment body text; serializer returns `null` for tombstones.
- Entry upvote/comment like mutations must remain idempotent (`desiredState: boolean`) so retries do not corrupt counts.
- Reaction count and reaction record changes must occur in the same Convex mutation.
- New replies increment the parent direct `replyCount` and the entry's total `commentCount` in the same transaction.
- Parent validation must confirm the comment belongs to the same entry before accepting a reply.
- `maxDepth` is write-time enforcement. Reads never recurse.
- Host configuration is passed through wrappers; do not create a configuration table.
- Keep host-specific business logic out of the component. Authentication remains host-controlled; the wrapper resolves the host identity and admin decision before calling the component.
- Keep notification, email, and push integrations host-controlled. The component should not depend on an external provider.
- Lifecycle callbacks execute in the host wrapper, not in the component. `beforeCreate` callbacks may transform or reject input, but component validation remains authoritative.
- Component mutations may return richer internal data when that lets host callbacks avoid follow-up queries. Do not expand public API results solely to satisfy a host callback.
- Avoid unnecessary component reads when the originating mutation already returns the context a callback needs.
- `afterCreate` and `afterChange` callbacks participate in the host transaction unless they schedule later work. External side effects should use app-owned actions scheduled by the host.
- Keep reaction mutations idempotent and make reaction callbacks run only for actual state transitions; callback consumers must preserve idempotency for any later work.
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
