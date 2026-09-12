# Convex Feedback Admin — Web

A forkable Vite admin panel for `convex-feedback`, built with Tailwind CSS, shadcn/ui, Clerk, and Convex.

## Set up

1. Expose the complete `exposeFeedbackApi(...)` result as `convex/feedback.ts` in your host Convex app. Its actor resolver must return `isAdmin: true` only for administrators. See the [component integration guide](../../../../packages/convex-feedback/README.md#admin-panel) for a Clerk example.
2. In Clerk, enable the Convex integration and make the admin value available to your host actor resolver. Authorization remains server-side; hiding this UI is not the security boundary.
3. Copy `.env.example` to `.env.local` and set your deployed Convex URL and Clerk publishable key.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

The app expects the component to be mounted at `api.feedback`. If your host exports another namespace, change the single binding in `src/lib/feedback.ts`; `createFeedbackHooks` also defaults to `anyApi.feedback` when no namespace is supplied.

## Deploy

Run `npm run build`, then deploy `dist` to any static host and configure the two `VITE_*` environment variables there. Add the deployed origin to Clerk's allowed origins.

The admin gate performs a one-shot `isAdmin` query after Clerk and Convex authentication settle. Every protected mutation is authorized again at the host boundary.
