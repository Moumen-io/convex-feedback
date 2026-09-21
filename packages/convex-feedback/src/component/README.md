# Component implementation

This directory is the isolated Convex component backend.

- `schema.ts`: durable feedback domain tables plus internal roadmap-rebalance bookkeeping, all with query-driven indexes.
- `entries.ts`: entry CRUD, full-text search, duplicate suggestions, entry voting, indexed pagination, actor activity pagination, and bounded permanent-deletion cleanup.
- `comments.ts`: direct-child pagination, recursive write validation, bounded subtree deletion, comment likes, and actor activity pagination.
- `reactions.ts`: actor activity pagination with live entry/comment target resolution.
- `migrations.ts`: bounded, idempotent legacy-entry backfills.
- `crons.ts`: immediate upgrade migration and temporary 30-day self-healing schedule.
- `model.ts`: reusable validators and public model types.
- `helpers.ts`: normalization, validation, and serializers.
- `convex.config.ts`: packaged component definition.
- `_generated/`: generated component API/server/data-model types. Regenerate after backend changes.

Important: component public functions become internal references when installed by a host app. The host must wrap them before exposing them to clients. Component IDs become strings at that boundary.

Lifecycle callbacks belong to the host wrapper, not this component. The wrapper
may transform or reject creation input before calling a component mutation and
may run after callbacks with the mutation's returned context. Keep authentication,
host business rules, and notification providers outside the component; component
validation remains authoritative.

Actor activity component queries accept a trusted `actorId` and use the
`by_actor` indexes. `entries.listByActor` can additionally receive
`includeAdminContext: true` for server-side consumers that need retained
metadata, priority, or roadmap context. The host `listUser*` wrappers resolve
the actor from the host callback and expose only their public activity shapes.

Entry deletion is an asynchronous permanent cleanup. The entry is marked as
deleting and hidden immediately, its roadmap link is detached, and scheduled
batches remove entry reactions, comment reactions, and all comments before the
entry document is hard-deleted. Comment deletion also marks its subtree and
removes descendants and reactions in bounded scheduled batches. Activity reads
omit pending and completed deletions.
