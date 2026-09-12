# React hooks layer

`createFeedbackHooks(api?, options?)` binds the host application's public Convex API to headless React hooks. With no API argument it uses `anyApi.feedback`; pass a generated API namespace when the host module has another name.

The hooks expose public entries, search/similarity, lazy direct-child comment pagination, mutations, admin inbox queries, tags, and roadmap operations. Reply queries are not mounted by the hook layer automatically; the UI decides when a comment is expanded.

Page-size defaults are client concerns. The server-side component still enforces its configured hard maximum. Keep the two aligned when overriding defaults.
