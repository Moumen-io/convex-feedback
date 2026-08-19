# convex-feedback native example

Expo / React Native example for `convex-feedback` and `convex-feedback-ui/native`.

The example also exports to web.

This client does **not** own a Convex backend. It connects to the shared `[example-backend](../example-backend/README.md)` deployment.

## Test locally

Initialize and run the shared backend from the repository root:

```bash
npm run dev:ios -w convex-feedback-example-native
npm run dev:web -w convex-feedback-example-native
```

Create `packages/example-native/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-development-deployment.convex.cloud
```

Then open the app on an iOS simulator, or Expo Web.

## Testing UI package changes

Run the Expo project:

```bash
npm run dev:ios -w convex-feedback-ui
```

and:

```bash
npm run dev -w convex-feedback-example-native
```

For Metro to pick up rebuilt workspace output, you must run:

```bash
npm run build -w convex-feedback-ui
```

or install a watcher to automatically run the build.

## Build the web demo

```bash
npm run build -w convex-feedback-example-native
```

The Expo web export is written to `packages/example-native/dist`.

---

For application integration and theme/component customization, see `[../convex-feedback-ui/README.md](../convex-feedback-ui/README.md)`.
