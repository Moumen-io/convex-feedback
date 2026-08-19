# convex-feedback React Native / Expo demo

A real Expo application for `convex-feedback-ui/native`. It runs on iOS, Android, and web; the web export can be hosted publicly so developers can try the native implementation in a browser.

## First run

From the monorepo root:

```bash
npm install
cd packages/example-native
npm run setup
npm run dev
```

`setup` creates/selects the example's Convex development deployment, generates its app API, and configures the JWT signing keys required by the anonymous Convex Auth provider. Expo starts after Convex is ready. Open iOS/Android as usual, or press `w` for the web build.

## Deploy the Expo web version

Configure production auth keys once, then deploy:

```bash
npm run auth:init -- --prod
npm run deploy:web
```

This builds `convex-feedback` and `convex-feedback-ui`, deploys the example Convex backend, injects its URL as `EXPO_PUBLIC_CONVEX_URL`, and runs `expo export --platform web`. Upload the generated `dist/` directory to a static host.

For native App Store/TestFlight builds, use the same Convex production deployment and configure `EXPO_PUBLIC_CONVEX_URL` in the EAS build environment.
