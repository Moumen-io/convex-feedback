# Routed Expo example

This Expo Router example uses the additive routed API from
`convex-feedback-ui/expo`. The feedback board, entry detail, and create-entry
modal are separate routes under `src/app/feedback`, while the public roadmap
has its own board and roadmap-item routes under `src/app/roadmap`.

`FeedbackStackLayout` and `RoadmapStackLayout` keep their shared providers
mounted while users move between the board and detail pages.

The routed roadmap uses a transparent native header and automatically accounts
for its stack header and supported iOS bottom search toolbar. Pass
`topInset` or `bottomInset` to `RoadmapStackLayout` when the host needs to
override those values; `bottomInset` is total occupied bottom space, including
the safe area.

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
