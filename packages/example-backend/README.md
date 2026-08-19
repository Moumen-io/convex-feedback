# convex-feedback example backend

Shared Convex backend for both deployable examples:

- `convex-feedback-example-web`
- `convex-feedback-example-native`

This workspace is the only example package that owns Convex functions, Convex Auth, the component installation, and generated application API types.

## Setup

From the repository root:

```bash
npm install
npm run setup -w convex-feedback-example-backend
```

`setup` selects/creates the development deployment, pushes the backend once, and configures the signing keys used by the anonymous Convex Auth provider.

Then keep the backend running while developing either client:

```bash
npm run dev -w convex-feedback-example-backend
```

## Generated API

Run:

```bash
npm run codegen -w convex-feedback-example-backend
```

The generated API is exported from this workspace as:

```ts
import { api } from "convex-feedback-example-backend/api";
```

Both example clients should use this import. Do not duplicate the generated API or create another `convex/` directory in either client.

## Deployment URL

Both clients must point to the same deployment URL:

- web: `VITE_CONVEX_URL`
- Expo/native: `EXPO_PUBLIC_CONVEX_URL`

For local development, use the development deployment URL.

## Production

Deploy this backend once:

```bash
npm run auth:init -w convex-feedback-example-backend -- --prod
npm run deploy -w convex-feedback-example-backend
```

Then deploy the two frontend examples independently. Neither frontend should execute `convex deploy`.
