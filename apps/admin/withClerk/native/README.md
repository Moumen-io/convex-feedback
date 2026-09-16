# Convex Feedback Admin — Expo

A forkable Expo admin app for `convex-feedback`, using Expo Router native tabs, Clerk's prebuilt native authentication UI, and the same backend contract as the web app.

## Set up

1. Expose the complete `exposeFeedbackApi(...)` result as `convex/feedback.ts` in your host Convex app. Its actor resolver must return `isAdmin: true` only for administrators. See the [component integration guide](../../../../packages/convex-feedback/README.md#admin-panel) for a Clerk example.
2. Enable Clerk's Convex integration and Native API. Clerk's prebuilt native views require a development build; they do not run in Expo Go.
3. Copy `.env.example` to `.env.local` and set the `EXPO_PUBLIC_*` values.
4. Install and launch a development build:

   ```bash
   npm install
   npx expo run:ios
   # or: npx expo run:android
   ```

After the first native build, use `npm start` for normal development. The app uses `expo-router/unstable-native-tabs`, so verify the target Expo SDK before upgrading.

The app expects the host namespace `api.feedback`. Change `lib/feedback.ts` if your component is exposed elsewhere. The root layout reactively checks `isAdmin` after authentication and offers retry when that check fails; the host still authorizes every protected operation.

## Deploy

Configure the two `EXPO_PUBLIC_*` variables in your EAS environment, then create a build with your usual EAS profile. Before running EAS or deploying to the App Store from a fork, you must replace `expo.ios.bundleIdentifier` in `app.json` (`com.moumentos.convex-feedback-admin`) with a bundle identifier registered under your own Apple Developer account. Run `eas init` to link the fork to your own EAS project, and update any Android package identifiers before store distribution as well.
