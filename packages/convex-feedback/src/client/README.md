# Host client layer

This layer is the supported server-side integration boundary between a host Convex app and the component.

- Construct the client with `createFeedback(...)` and the generated component reference.
- Resolve authentication and moderation in the host app. Components do not own host authentication.
- Keep `actor.id` stable. It is the identity used for authorship, entry upvotes, and comment likes.
- Configuration is static code configuration; there is no configuration table.
- Call the returned methods from host queries/mutations instead of exposing component internals directly.

Do not add user/profile persistence here. Display profiles belong to the host application.
