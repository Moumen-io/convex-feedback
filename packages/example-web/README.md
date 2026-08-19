# convex-feedback web example

Deployable Vite + React example for `convex-feedback` and `convex-feedback-ui`.

This frontend does **not** own a Convex backend. It connects to the shared `[example-backend](../example-backend/README.md)` deployment and imports its generated API.

## Test locally

From the repository root, first initialize and run the shared backend:

```bash
npm run setup -w convex-feedback-example-backend
npm run dev -w convex-feedback-example-backend
```

In `packages/example-web/.env.local`, point Vite at the backend's development deployment URL:

```bash
VITE_CONVEX_URL=https://your-development-deployment.convex.cloud
```

Then start the web example in another terminal:

```bash
npm run dev -w convex-feedback-example-web
```

## Testing UI package changes

Run the Vite server:

```bash
npm run dev -w convex-feedback-ui
```

and:

```bash
npm run dev -w convex-feedback-example-web
```

If you are not using the watcher, rebuild manually after UI changes:

```bash
npm run build -w convex-feedback-ui
```

---

For actual application integration, use the package READMEs rather than copying demo-specific authentication setup.
