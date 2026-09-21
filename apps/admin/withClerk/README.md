# Convex Feedback Admin with Clerk

Two standalone reference clients expose the same admin contract:

- [`web`](./web/README.md): Vite, Tailwind CSS, shadcn/ui, and Clerk React.
- [`native`](./native/README.md): Expo Router, native tabs, and Clerk Expo.

Both apps connect to a host Convex deployment whose `feedback` module exports the API returned by `exposeFeedbackApi`. They intentionally keep authentication and the admin decision in the host application, outside the component. See the [host wrapper integration guide](../../../packages/convex-feedback/README.md#2-expose-the-component-through-your-host-api) for the API surface and the [lifecycle callback reference](../../../packages/convex-feedback/README.md#lifecycle-callbacks) for optional host callbacks.

Start with either app's README. The normal flow is: fork this repository, configure Clerk and Convex, copy the app's `.env.example` to `.env.local`, and deploy.
