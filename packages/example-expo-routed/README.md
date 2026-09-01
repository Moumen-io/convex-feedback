# Routed Expo example

This Expo Router example uses the additive routed API from
`convex-feedback-ui/expo`. The board, entry detail, and create-entry modal are
separate routes under `src/app/feedback`, while `FeedbackStackLayout` keeps the
shared feedback providers mounted above all three screens.

Create `.env.local` with the shared example backend URL:

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-development-deployment.convex.cloud
```

Then run from the repository root:

```bash
npm run dev:expo:routed
```

The route files under `src/app/feedback` are the intended integration example
for consuming applications. The nested `new` stack keeps suggested entries
inside the existing modal instead of presenting an additional modal.
