# Universal Expo/native admin app

`convex-feedback-admin-universal` is the runtime-configured Expo admin client.
It keeps the existing [`withClerk`](../withClerk) web and native apps intact,
but lets one native build connect to multiple host deployments.

## Run it

```bash
npm install
npm run build:admin
npm run start -w convex-feedback-admin-universal
```

The first launch opens setup. Choose Convex Auth or Clerk, enter the Convex
deployment URL and the host API namespace (the form displays the `api.` prefix),
then enter the provider's public configuration and the admin sign-in methods
enabled by that host. The configuration is saved in `expo-secure-store`.

The app never asks for or persists Convex server keys, Clerk secret keys, OAuth
client secrets, signing keys, or other server-side credentials. Session tokens
are also namespaced per project and stored through SecureStore-backed adapters.

After setup, the lifecycle is:

1. Load the selected project configuration.
2. Mount the configured auth adapter and a `ConvexReactClient` for the stored URL.
3. Resolve the configured API namespace dynamically from Convex `anyApi`.
4. Show the shared provider-agnostic login screen when signed out.
5. Call the host `isAdmin` query before mounting the existing admin routes.

Settings can add, edit, remove, and switch projects. Editing a project remounts
the auth and Convex providers, so tokens and queries cannot leak between active
configurations.

The runtime and adapter contract lives in
[`convex-feedback-admin-auth`](../../../packages/adminAuth/README.md). It
documents the public configuration shape, SecureStore behavior, supported
providers, and the steps for adding Auth0, WorkOS, OIDC, or another adapter.
