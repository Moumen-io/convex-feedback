[![npm version](https://badge.fury.io/js/convex-feedback-ui.svg)](https://badge.fury.io/js/convex-feedback-ui) [![Convex Component](https://www.convex.dev/components/badge/convex-feedback)](https://www.convex.dev/components/convex-feedback) ![NPM License](https://img.shields.io/npm/l/convex-feedback-ui) ![NPM Downloads](https://img.shields.io/npm/dw/convex-feedback-ui) ![GitHub forks](https://img.shields.io/github/forks/moumen-io/convex-feedback) ![GitHub Repo stars](https://img.shields.io/github/stars/moumen-io/convex-feedback)

[Vite demo](https://convex-feedback-vite.vercel.app/) • [Expo/React Native demo](https://convex-feedback-expo.vercel.app/)

# convex-feedback-ui

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

### Using the Expo screen without stack integration

Expo projects do not have to use the native stack integration.

Set `useStack={false}` to use the standard native feedback layout instead:

```tsx
<FeedbackScreen hooks={feedbackHooks} useStack={false} />
```

When `useStack={false}`, the Expo convenience screen behaves like the regular React Native screen.

`StackOptions` is only available when stack integration is enabled.

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
