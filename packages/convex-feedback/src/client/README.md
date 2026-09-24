# Host client layer

This layer is the supported server-side integration boundary between a host Convex app and the component.

- Expose the host API with `exposeFeedbackApi(...)` and the generated component reference.
- Resolve authentication and admin authorization in the host app. Components do not own host authentication.
- Keep `actor.id` stable. It is the identity used for authorship, entry upvotes, and comment likes.
- Configuration is static code configuration; there is no configuration table.
- Call the returned methods from host queries/mutations instead of exposing component internals directly.
- Use `listUserEntries`, `listUserComments`, and `listUserReactions` for authenticated actor activity. Their public arguments contain only pagination options; the actor is always resolved by the configured host callback.

Do not add user/profile persistence here. Display profiles belong to the host application.

Lifecycle callbacks are configured on `exposeFeedbackApi` in the host app, not
on the component client. See the canonical [lifecycle callback reference](../../README.md#lifecycle-callbacks)
for ordering, rejection behavior, transaction semantics, and reaction events.
