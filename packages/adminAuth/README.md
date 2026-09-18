# `convex-feedback-admin-auth`

Runtime configuration and native authentication adapters for the universal
`convex-feedback` admin app.

## Runtime configuration

The universal app stores one or more public project configurations:

```ts
{
  id: "project-1",
  name: "My product",
  convexUrl: "https://my-deployment.convex.cloud",
  apiNamespace: "feedback", // the app resolves api.feedback at runtime
  auth: {
    provider: "clerk",
    publicConfig: {
      publishableKey: "pk_live_…",
      methods: {
        password: true,
        emailCode: true,
        sso: [{ id: "apple", label: "Apple" }]
      }
    }
  },
  updatedAt: Date.now()
}
```

The setup screen validates the Convex URL, namespace, provider configuration,
and selected sign-in methods before saving. The `api.` prefix is displayed in
the form but is not duplicated in the stored namespace.

The supported providers are Convex Auth and Clerk. Auth0, WorkOS, and generic
OIDC are represented as explicit placeholders so they can be added without
coupling provider-specific code to the admin screens.

## Storage and security

Project configuration is persisted with `expo-secure-store`. Authentication
tokens use provider-specific adapters with a project namespace, so switching
projects remounts the auth and Convex providers and keeps sessions isolated.
Removing a project clears its known local auth keys on a best-effort basis.

Only public client configuration is accepted: Convex deployment URLs, API
namespaces, Clerk publishable keys, and enabled sign-in methods. Convex server
keys, Clerk secret keys, OAuth client secrets, signing keys, and refresh/access
tokens are never requested as setup input or persisted as project config.

The host deployment remains responsible for authorization. The universal app
checks the configured `isAdmin` endpoint before showing admin screens, and
protected Convex operations must continue to enforce admin access themselves.

## Adding an auth adapter

Adapters implement the provider-independent `AdminAuthController` contract:

- `status`, `isAuthenticated`, and the optional admin account summary;
- password, email-code, SSO, and MFA sign-in actions;
- `availableSsoMethods` and the supported method flags;
- `challenge` for email verification or second-factor steps;
- `getToken` and `signOut`.

To add a provider:

1. Add its public configuration type and provider metadata in `contracts.ts`
   and `config.ts`. Keep server secrets out of the type and validation rules.
2. Add a provider runtime under `src/native.tsx` that mounts the provider's
   native context and the matching `Convex` provider, then translates provider
   state and errors into `AdminAuthController`.
3. Map provider SSO and MFA states into the shared method and challenge types.
   The reusable login screen will render those methods without provider-specific
   branches.
4. Add the public fields to the setup form and validation only. Do not move
   provider logic into `adminAppScreens`.
5. Add normalization and validation tests, and verify that changing the active
   project remounts the adapter and uses the new Convex URL/namespace.

The adapter may expose a provider-owned account-management view through the
auth package, but the shared settings screen remains provider-agnostic.
