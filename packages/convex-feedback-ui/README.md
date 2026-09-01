[![npm version](https://badge.fury.io/js/convex-feedback-ui.svg)](https://badge.fury.io/js/convex-feedback-ui) [![Convex Component](https://www.convex.dev/components/badge/convex-feedback)](https://www.convex.dev/components/convex-feedback) ![NPM License](https://img.shields.io/npm/l/convex-feedback-ui) ![NPM Downloads](https://img.shields.io/npm/dw/convex-feedback-ui) ![GitHub forks](https://img.shields.io/github/forks/moumen-io/convex-feedback) ![GitHub Repo stars](https://img.shields.io/github/stars/moumen-io/convex-feedback)

[Vite demo](https://convex-feedback-vite.vercel.app/) • [Expo demo](https://convex-feedback-expo.vercel.app/) • [React Native demo](https://convex-feedback-native.vercel.app/)

# convex-feedback-ui

| Expo                                                                                                | React Native                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| ![Expo](https://raw.githubusercontent.com/Moumen-io/convex-feedback/main/docs/screenshots/expo.png) | ![React Native](https://raw.githubusercontent.com/Moumen-io/convex-feedback/main/docs/screenshots/native.png) |

Optional React DOM, React Native, and Expo Router UI for `convex-feedback`.

The package is intentionally layered:

```text
convex-feedback hooks
        ↓
compound UI primitives
        ↓
prebuilt FeedbackScreen
        ↓
optional Expo Router integration
```

Use the prebuilt screen for a complete feedback board, compose primitives for custom layouts, or ignore this package entirely and use the headless `convex-feedback` hooks directly.

## React DOM

```tsx
import { FeedbackScreen } from "convex-feedback-ui";
import { feedbackHooks } from "./hooks/feedbackHooks";
import "convex-feedback-ui/styles.css";

<FeedbackScreen hooks={feedbackHooks} />;
```

The default stylesheet:

- has no Tailwind dependency;
- uses namespaced `cf-*` classes;
- uses low-specificity `:where(...)` selectors;
- uses CSS custom properties for theme values;
- allows normal host CSS, Tailwind, or CSS-module classes to override defaults;
- can be omitted entirely if you want to provide your own styling.

Key colors can be overridden directly:

```tsx
<FeedbackScreen
  hooks={feedbackHooks}
  primaryColor="#6d5efc"
  backgroundColor="#0d0d10"
  surfaceColor="#17171b"
  textColor="#ffffff"
  mutedColor="#a0a0aa"
  borderColor="#2d2d34"
/>
```

Or provide theme tokens through `FeedbackProvider`.

## React Native

Use the `/native` entry point for React Native projects that do not use Expo Router, or whenever you want the standard React Native implementation without native stack integration:

```tsx
import { FeedbackScreen } from "convex-feedback-ui/native";

<FeedbackScreen
  hooks={feedbackHooks}
  theme={{
    colors: {
      primary: "#6d5efc",
      background: "#ffffff",
      surface: "#ffffff",
    },
  }}
/>;
```

The native `FeedbackScreen` includes the feedback UI using React Native components.

## Expo Router

Expo Router projects can use the `/expo` entry point:

```tsx
import { FeedbackScreen } from "convex-feedback-ui/expo";

<FeedbackScreen
  hooks={feedbackHooks}
  theme={{
    colors: {
      primary: "#6d5efc",
      background: "#ffffff",
      surface: "#ffffff",
    },
  }}
/>;
```

The Expo version uses the same native feedback UI, but adds optional Expo Router stack integration.

By default, `useStack` is enabled:

```tsx
<FeedbackScreen hooks={feedbackHooks} useStack />
```

When enabled, the prebuilt screen can integrate with the current Expo Router stack, including native stack configuration, toolbar actions, back behavior, and native search UI.

Stack options can be customized through `StackOptions`:

```tsx
<FeedbackScreen
  hooks={feedbackHooks}
  stackOptions={{
    headerLargeTitleEnabled: true,
    headerTransparent: true,
  }}
/>
```

iOS toolbar actions keep their package-provided SF Symbols. Android accepts
host-provided image sources; when an image is omitted, the action falls back to
its text label:

```tsx
<FeedbackScreen
  hooks={feedbackHooks}
  androidToolbarIcons={{
    create: require("./assets/add.png"),
    back: require("./assets/back.png"),
  }}
/>
```

### Using the Expo screen without stack integration

Expo projects do not have to use the native stack integration.

Set `useStack={false}` to use the standard native feedback layout instead:

```tsx
<FeedbackScreen hooks={feedbackHooks} useStack={false} />
```

When `useStack={false}`, the Expo convenience screen behaves like the regular React Native screen.

`StackOptions` is only available when stack integration is enabled.

### Routed Expo navigation

For real stacked routes, use the additive routed API. Expo Router discovers
routes from the application's `app` directory, so the host application supplies
small route files while the package supplies their layouts and screens:

```text
app/feedback/
├── _layout.tsx
├── index.tsx
├── [entryId].tsx
└── new/
    ├── _layout.tsx
    ├── index.tsx
    └── [entryId].tsx
```

The layout owns the feedback providers and keeps them mounted across the board,
entry-detail, and create-entry routes:

```tsx
// app/feedback/_layout.tsx
import {
  FeedbackStackLayout,
  feedbackStackSettings,
} from "convex-feedback-ui/expo";
import { feedbackHooks } from "../../feedback";

export const unstable_settings = feedbackStackSettings;

export default function Layout() {
  return (
    <FeedbackStackLayout
      hooks={feedbackHooks}
      androidToolbarIcons={{
        create: require("../../assets/add.png"),
        back: require("../../assets/back.png"),
        close: require("../../assets/close.png"),
      }}
      screenOptions={{ headerTintColor: "#5b5bd6" }}
      boardOptions={{ headerLargeTitleEnabled: true }}
      entryOptions={{ headerBackTitle: "Feedback" }}
      createOptions={{ presentation: "formSheet" }}
    />
  );
}
```

Each page file only needs to re-export its package screen:

```tsx
// app/feedback/index.tsx
export { FeedbackBoardScreen as default } from "convex-feedback-ui/expo";

// app/feedback/[entryId].tsx
export { FeedbackEntryScreen as default } from "convex-feedback-ui/expo";

// app/feedback/new/_layout.tsx
import {
  FeedbackCreateStackLayout,
  feedbackCreateStackSettings,
} from "convex-feedback-ui/expo";

export const unstable_settings = feedbackCreateStackSettings;
export default FeedbackCreateStackLayout;

// app/feedback/new/index.tsx
export { CreateFeedbackScreen as default } from "convex-feedback-ui/expo";

// app/feedback/new/[entryId].tsx
export { FeedbackEntryScreen as default } from "convex-feedback-ui/expo";
```

`FeedbackStackLayout` uses these route names by default:

```ts
{
  board: "index",
  entry: "[entryId]",
  create: "new",
}
```

Names can be partially overridden when the files use a different structure.
The create name identifies its nested route directory, and the entry route must
exist both beside that directory and inside it while retaining the `[entryId]`
dynamic segment:

```tsx
const routes = {
  entry: "entry/[entryId]",
  create: "create",
};

export const unstable_settings = createFeedbackStackSettings(routes);

export default function Layout() {
  return <FeedbackStackLayout hooks={feedbackHooks} routes={routes} />;
}
```

The board's search and loaded list remain mounted when another screen is
pushed, so returning restores the prior query and scroll position. The create
route is a modal navigator by default. Duplicate suggestions push the normal
detail screen inside that modal's stack, with back and close controls. After
creation, the complete modal is dismissed and the created entry replaces it on
the board stack.

See `packages/example-expo-routed` for a complete application.

## Diagnostic metadata

Prebuilt screens can collect creation-time diagnostic metadata for feedback entries. Collection is disabled by default and never applies to comments.

Enable the platform defaults for every entry kind:

```tsx
<FeedbackScreen hooks={feedbackHooks} collectMetadata />
```

Or combine global defaults with per-kind behavior:

```tsx
<FeedbackScreen
  hooks={feedbackHooks}
  collectMetadata={{
    standard: true,
    additional: { releaseChannel: "production" },
    kinds: {
      feedback: false,
      feature_request: {
        standard: ["platform", "appVersion"],
      },
      bug_report: {
        standard: true,
        additional: async ({ kind }) => ({
          kind,
          accountTier: await getAccountTier(),
        }),
      },
    },
  }}
/>
```

- A kind-specific `standard` selection replaces the global selection. Global and kind-specific `additional` values are merged, with kind-specific keys taking precedence.
- A kind set to `false` disables all metadata collection for that kind.
- Collection happens only when the user finally submits.
- Unavailable or failed collection sources are omitted without blocking feedback submission.

- Web defaults include `platform`, `user agent`, `language`, `timezone`, `screen` and `viewport` dimensions, and `device pixel ratio`.
- React Native defaults include `platform`, `OS` version, available device model, screen `dimensions`, `pixel ratio`, and `font scale`.
- The Expo entry point additionally uses `expo-constants` for app `version`, `build` number, `application ID`, `Expo runtime version`, and execution `environment` when available.
- Generic React Native apps can provide app `version` and `build` values through `additional`.

Metadata is stored in separate `standard` and `additional` sections. It is omitted from list and search results and from non-moderator reads. When the host's server-side actor resolver identifies a moderator, `getEntry` includes the metadata and the entry detail screen shows a metadata viewer.

The platform collectors and `formatMetadataKey` helper are exported from their respective package entry points for custom integrations.

## Choosing an API

For a complete implementation with minimal setup:

```text
Web                  → convex-feedback-ui
React Native         → convex-feedback-ui/native
Expo Router          → convex-feedback-ui/expo
```

For custom layouts, use the primitives exposed by the relevant entry point instead of the prebuilt `FeedbackScreen`.

The prebuilt screens are convenience APIs. They are built from the same public primitives available to consumers, so applications are not required to adopt the prebuilt layout or navigation behavior.

You can also import the prebuilt screen components directly if you only want certain parts without reaching for primitives.

## Using primitives

Web and native expose the same conceptual compounds:

- `FeedbackBoard.*`
- `FeedbackEntry.*`
- `FeedbackForm.*`
- `Comment.*`

Example:

```tsx
<FeedbackEntry.Root entry={entry}>
  <FeedbackEntry.Upvote onToggle={setUpvote} />

  <FeedbackEntry.Content>
    <FeedbackEntry.Status />
    <FeedbackEntry.Title />
    <FeedbackEntry.Body />
    <FeedbackEntry.CommentCount />
  </FeedbackEntry.Content>
</FeedbackEntry.Root>
```

Containers accept arbitrary children, so layout remains controlled by the host application.

Native primitives can also be composed directly:

```tsx
<FeedbackBoard.Root>
  <FeedbackBoard.Header>
    <FeedbackBoard.Title />
  </FeedbackBoard.Header>

  <FeedbackBoard.Search value={query} onValueChange={setQuery} />

  <FeedbackBoard.List>
    {entries.map((entry) => (
      <FeedbackEntry.Root key={entry.id} entry={entry}>
        {/* custom entry layout */}
      </FeedbackEntry.Root>
    ))}
  </FeedbackBoard.List>
</FeedbackBoard.Root>
```

Using primitives directly is the recommended escape hatch when the prebuilt screen's navigation, search, layout, or presentation does not fit the host application.

## Replacing primitive implementations

Interactive leaf primitives accept typed render-function children. This is the escape hatch for shadcn, Radix-derived controls, Expo UI, or application-specific native controls.

```tsx
<Comment.Like onToggle={setLiked}>
  {({ active, count, toggle }) => (
    <MyLikeControl active={active} count={count} onPress={toggle} />
  )}
</Comment.Like>
```

The render function replaces the entire visual implementation while preserving state and action wiring. Regular children replace only the default content where supported.

This pattern is intentionally used instead of relying on a DOM-specific `asChild` clone mechanism, so it works across React DOM and React Native.

## Localization and copy customization

The package has no i18n runtime dependency. All package-owned text is represented by `FeedbackMessages` and has English defaults.

Override only what you need:

```tsx
<FeedbackScreen
  hooks={feedbackHooks}
  messages={{
    board: {
      title: "Produktfeedback",
      searchPlaceholder: "Feedback durchsuchen…",
    },
    comments: {
      viewReplies: (count) => `${count} Antworten anzeigen`,
    },
  }}
/>
```

This is compatible with i18next, react-intl, Lingui, custom dictionaries, or plain static objects. Call your application's translation function when building the `messages` object.

Precedence for copy is:

```text
local primitive label/children
→ FeedbackProvider / FeedbackScreen messages
→ built-in English messages
```

User-generated entry and comment content is never translated, normalized for display, or rewritten.

## Lazy replies

The prebuilt screens preserve the backend lazy-loading model. Top-level comments mount one paginated query. A `CommentBranch` only mounts its `ReplyList` after the user expands that comment. Each reply with children repeats the same pattern.

This means deep threads do not create queries until the relevant branch is opened.

## Sorting

Pass `commentSort="top" | "newest" | "oldest"` to the prebuilt screen for globally correct server ordering.

For custom presentation ordering, provide:

```tsx
transformComments={(comments) =>
  [...comments].sort(myComparator)
}
```

That transform only affects comments already loaded at the current direct-child level. It is deliberately not described as a globally paginated server sort.

## Localization invariant

When adding visible package copy:

1. add it to `FeedbackMessages`;
2. add an English default;
3. consume it through the UI context;
4. update localization contract tests if the shape changes.

Do not hardcode new visible sentences inside a primitive or prebuilt screen.

## Monorepo development

From the repository root, run:

```bash
npm install
npm run codegen
npm run test:all
```
