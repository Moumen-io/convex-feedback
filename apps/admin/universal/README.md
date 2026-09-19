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

The first launch opens a routed setup Stack. Enter the project name, Convex
deployment URL, and host API namespace (the setup screen displays the `api.`
prefix), test the connection, choose Convex Auth or Clerk, then enter the
provider's public configuration and enabled admin sign-in methods. The setup
draft stays in memory while moving between steps and is saved in
`expo-secure-store` only after the connection check succeeds.

### Setup validation

Use **Test connection** after entering the deployment URL and API namespace.
The app makes an unauthenticated query to `api.<namespace>.isAdmin`, so the
check verifies all of the following before anything is persisted:

- the deployment URL is a valid root URL;
- the deployment can be reached from the device;
- the dynamic `anyApi` reference resolves to the configured namespace; and
- the host exported a callable `isAdmin` query that returns a boolean.

`false` is the expected result for an unauthenticated probe. It means the
deployment and endpoint responded; it is not an admin access grant. Saving
automatically repeats the check when the URL or namespace has changed, and
shows the deployment or endpoint error inline when the check fails.

When Convex Auth is selected, the setup form also asks for the exact host
provider IDs for password, email-code, and each selected SSO method. These are
runtime values: the app does not assume `password`, `email`, or that a button
label such as `google` is the Convex provider ID.

The app never asks for or persists Convex server keys, Clerk secret keys, OAuth
client secrets, signing keys, or other server-side credentials. Session tokens
are namespaced per project and stored through SecureStore-backed adapters.

After setup, the lifecycle is:

1. Load the selected project configuration.
2. Mount the configured auth adapter and a `ConvexReactClient` for the stored URL.
3. Resolve the configured API namespace dynamically from Convex `anyApi`.
4. Show the shared provider-agnostic login screen when signed out.
5. Call the host `isAdmin` query before mounting the existing admin routes.

Settings can add, edit, remove, and switch projects. Editing a project remounts
the auth and Convex providers, so tokens and queries cannot leak between active
configurations.

## Native release identity

The checked-in Expo configuration provides stable identifiers for native
prebuilds and store builds:

| Setting                        | Value                                           |
| ------------------------------ | ----------------------------------------------- |
| iOS bundle identifier          | `com.moumentos.convex-feedback-universal-admin` |
| Android package/application ID | `com.moumentos.convexfeedback.universaladmin`   |
| Expo app scheme                | `convex-feedback-admin`                         |
| Native auth callback           | `convex-feedback-admin://auth/callback`         |

The bundle identifier and Android package identify the published apps. If you
are publishing a fork or a separate product, replace them in `app.json` before
the first store build and register the replacement values with Apple, Google,
and Clerk. Keep the scheme stable after publishing; changing it also changes
the callback URI that must be registered with the auth provider.

The app uses a custom scheme because OAuth and email-link flows must return to a
native build. Expo Go is not a release target for these flows; use a local
development build or an EAS build.

The login screen never exposes a sign-up screen, CTA, or registration flow.
Clerk SSO is additionally sign-in-only in this app: after the provider callback,
an identity Clerk marks as transferable is rejected instead of being passed to
Clerk's sign-up transfer. Convex Auth keeps its normal provider-managed OAuth
behavior because the installed `@convex-dev/auth` version creates or updates
the account on the host during the OAuth callback; admin access is still
checked by the host's `isAdmin` endpoint. No host configuration is added just
to suppress account creation.

## Provider registration for a published app

The app contains public client configuration, but the provider dashboards and
the host Convex deployment still need to be configured separately.

### Clerk

Use the production Clerk instance and a matching `pk_live_…` publishable key
for a store build. In the Clerk Dashboard:

1. Enable the Native API for the instance.
2. In Native applications, register the iOS app with the exact iOS bundle ID
   above and the Apple Team ID.
3. Register the Android app with the exact Android namespace/package above.
4. Add the exact native callback
   `convex-feedback-admin://auth/callback` to the mobile SSO redirect
   allowlist. This is the custom URL used by this app; it is not Clerk's
   default `{bundleIdentifier}://callback` URL.
5. Configure each SSO connection selected in the setup screen in Clerk
   Dashboard. The universal app does not collect or store provider-dashboard
   credentials; the developer owns that provider setup separately.

The app passes the same callback to Clerk's native SSO and email-link flows.
Password and email-code sign-in do not use a browser callback. Rebuild the
native app after changing native application registration or the scheme.

### Convex Auth

In the host Convex app:

1. Deploy the current `@convex-dev/auth` configuration and configure every
   selected provider. The provider IDs entered in setup must exactly match the
   IDs used by the host's `signIn` configuration.
2. Export the complete `exposeFeedbackApi(...)` result from a public module such
   as `convex/feedback.ts`, including `isAdmin`. The actor resolver should
   return `isAdmin: true` only for administrators and the query should return
   `false` for an unauthenticated caller.
3. Allow the exact native redirect in the host's Convex Auth
   `callbacks.redirect` policy. Keep the existing trusted relative/site URLs
   needed by the host, and add only this exact native URL:

   ```ts
   const nativeAdminRedirect = "convex-feedback-admin://auth/callback";
   const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");

   callbacks: {
     async redirect({ redirectTo }) {
       if (redirectTo === nativeAdminRedirect) return redirectTo;
       if (
        redirectTo.startsWith("/") ||
        (siteUrl &&
          (redirectTo === siteUrl ||
            redirectTo.startsWith(`${siteUrl}/`) ||
            redirectTo.startsWith(`${siteUrl}?`)))
       ) {
         return redirectTo;
       }
       throw new Error("Untrusted authentication redirect");
     },
   }
   ```

   The callback belongs in the options passed to the host's `convexAuth({ ... })`
   setup. Provider and host configuration remain outside this app; the native
   scheme above is the final `redirectTo` destination for this app.

4. Deploy the host before using **Test connection**. A successful unauthenticated
   `false` response confirms that the deployment and exported endpoint are
   ready; sign-in and admin authorization are still enforced by the host.

The runtime and adapter contract lives in
[`convex-feedback-admin-auth`](../../../packages/adminAuth/README.md). It
documents the public configuration shape, SecureStore behavior, supported
providers, and the steps for adding Auth0, WorkOS, OIDC, or another adapter.

## Validation and release commands

The universal workspace exposes progressively stronger checks:

```bash
# Typecheck plus static Expo exports for web, iOS, and Android.
npm run validate -w convex-feedback-admin-universal

# Includes the universal validation above, package tests, formatting, and builds.
npm run test:all

# Generate native projects and inspect the resolved app config.
npm run prebuild:ios -w convex-feedback-admin-universal
npm run prebuild:android -w convex-feedback-admin-universal
cd apps/admin/universal && npx expo config --type public

# Local macOS/Xcode and Android SDK/Java release checks.
npm run build:ios:release -w convex-feedback-admin-universal
npm run build:android:release -w convex-feedback-admin-universal
```

The iOS release check requires Xcode and CocoaPods. The Android release check
requires a configured Android SDK, emulator/device tooling, and Java. Static
Expo exports remain useful on machines without those native toolchains.

For EAS, link the app to your own EAS project before the first cloud build:

```bash
cd apps/admin/universal
npx eas init
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

The checked-in `eas.json` supplies development, preview, production, and submit
profiles but intentionally does not contain a project ID belonging to a
particular publisher.
