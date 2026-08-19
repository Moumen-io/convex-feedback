# Component implementation

This directory is the isolated Convex component backend.

- `schema.ts`: three tables and query-driven indexes.
- `entries.ts`: entry CRUD, full-text search, duplicate suggestions, entry voting, indexed pagination.
- `comments.ts`: direct-child pagination, recursive write validation, soft deletion, comment likes.
- `model.ts`: reusable validators and public model types.
- `helpers.ts`: normalization, validation, and serializers.
- `convex.config.ts`: packaged component definition.
- `_generated/`: generated component API/server/data-model types. Regenerate after backend changes.

Important: component public functions become internal references when installed by a host app. The host must wrap them before exposing them to clients. Component IDs become strings at that boundary.
