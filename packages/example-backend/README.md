# convex-feedback example backend

Shared Convex backend used by both demo clients:

- `convex-feedback-example-web`
- `convex-feedback-example-native`

This workspace is the only example package that owns the example Convex deployment, Convex Auth setup, `convex-feedback` component installation, host API wrapper, and generated application API.

It is an example/test harness for this repository.

## Test locally

From the repository root:

```bash
npm install
npm run setup -w convex-feedback-example-backend
```

`setup` initializes/selects the development deployment, builds the local packages, pushes the backend once, and configures the anonymous-auth signing keys used by the demo.

Then run the backend while testing either client:

```bash
npm run dev -w convex-feedback-example-backend
```

The Convex CLI writes the development deployment configuration locally. Use that deployment URL in both frontend examples.

## Code generation

```bash
npm run codegen -w convex-feedback-example-backend
```

The generated API is exported from this workspace:

```ts
import { api } from "convex-feedback-example-backend/api";
```

All frontend examples should import this generated API. They should **not** contain their own `convex/` directories or run their own Convex codegen.

## Shared deployment URL

For local development:

- web uses `VITE_CONVEX_URL`;
- Expo/native uses `EXPO_PUBLIC_CONVEX_URL`.

Point both values at the same Convex development deployment.

## Use Clerk authentication

The backend accepts Clerk session tokens when `CLERK_JWT_ISSUER_DOMAIN` is set
on the Convex deployment. This is optional, so the anonymous Convex Auth flow
used by the basic demos continues to work when the variable is unset.

Convex environment variable to add:

- `CLERK_JWT_ISSUER_DOMAIN`: the Clerk Frontend API URL for that environment.
  Use the development Clerk instance on the development deployment and the
  production Clerk instance on the production deployment.

The existing anonymous Convex Auth flow also uses `JWT_PRIVATE_KEY` and
`JWKS`. `npm run setup -w convex-feedback-example-backend` creates them for
development; see the production setup below for the production command.

In the Clerk Dashboard, activate the Convex integration and copy the Frontend
API URL for each Clerk instance. Set the development and production URLs on the
matching Convex deployments:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-dev.clerk.accounts.dev
npx convex env --prod set CLERK_JWT_ISSUER_DOMAIN https://clerk.your-domain.com
```

Run these commands from `packages/example-backend`. Sync the updated auth
configuration by running `npm run dev -w convex-feedback-example-backend` for
development or `npm run deploy -w convex-feedback-example-backend` for
production. The Clerk Frontend API URL must match the Clerk instance used by the
client.

For client apps using Clerk, configure the Clerk publishable key in the app's
environment (for example, `VITE_CLERK_PUBLISHABLE_KEY` for the web client or
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for Expo/native). These are client-side
variables and do not belong in Convex.

## Deploy the backend

The production backend should be deployed once, independently from the two frontend deployments.

Configure production anonymous-auth keys:

```bash
npm run auth:init -w convex-feedback-example-backend -- --prod
```

Deploy:

```bash
npm run deploy -w convex-feedback-example-backend
```

For production integration instructions, see `[../convex-feedback/README.md](../convex-feedback/README.md)`.
