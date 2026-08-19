# React hooks layer

`createFeedbackHooks(api, options?)` binds the host application's public Convex API to headless React hooks.

The hooks expose entries, search/similarity, lazy direct-child comment pagination, mutations, and the configured client page sizes. Reply queries are not mounted by the hook layer automatically; the UI decides when a comment is expanded.

Page-size defaults are client concerns. The server-side component still enforces its configured hard maximum. Keep the two aligned when overriding defaults.
