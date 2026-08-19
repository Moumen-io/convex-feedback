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
