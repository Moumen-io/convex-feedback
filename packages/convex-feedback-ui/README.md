[![npm version](https://badge.fury.io/js/convex-feedback-ui.svg)](https://badge.fury.io/js/convex-feedback-ui) ![NPM License](https://img.shields.io/npm/l/convex-feedback-ui) ![NPM Downloads](https://img.shields.io/npm/dw/convex-feedback-ui) ![GitHub forks](https://img.shields.io/github/forks/moumen-io/convex-feedback) ![GitHub Repo stars](https://img.shields.io/github/stars/moumen-io/convex-feedback)

[Vite demo](https://convex-feedback-vite.vercel.app/) • [Expo/React Native demo](https://convex-feedback-expo.vercel.app/)

# convex-feedback-ui

Optional React DOM and React Native UI for `convex-feedback`.

The package is intentionally layered:

```text
convex-feedback hooks
        ↓
compound UI primitives
        ↓
prebuilt FeedbackScreen
```

Use the prebuilt screen for a complete feedback board, compose primitives for custom layouts, or ignore this package and use the headless hooks directly.

## React DOM

```tsx
import { FeedbackScreen } from "convex-feedback-ui";
import "convex-feedback-ui/styles.css";

<FeedbackScreen hooks={feedbackHooks} />;
```

The default stylesheet:

- has no Tailwind dependency;
- uses namespaced `cf-*` classes;
- uses low-specificity `:where(...)` selectors;
- uses CSS custom properties for theme values;
- allows normal host CSS/Tailwind/CSS-module classes to override defaults;
- can be omitted entirely if you want headless markup.

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

All native implementation files and exports live under `/native`:

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

There is no NativeWind dependency. Native style precedence is:

```text
component color/style prop
→ provider theme
→ built-in fallback theme
```

Normal React Native `style` props remain available.

## Compound components

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

Containers accept arbitrary children, so layout is controlled by the host.

## Replacing primitive implementations

Interactive leaf primitives accept typed render-function children. This is the escape hatch for shadcn, Radix-derived controls, Expo UI, or application-specific native controls.

```tsx
<Comment.Like onToggle={setLiked}>
  {({ active, count, toggle }) => (
    <MyLikeControl active={active} count={count} onPress={toggle} />
  )}
</Comment.Like>
```

The render function replaces the entire visual implementation while preserving state/action wiring. Regular children replace only the default content where supported.

This pattern is intentionally used instead of relying on a DOM-specific `asChild` clone mechanism, so it works on both React DOM and React Native.

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
transformComments={(comments) => [...comments].sort(myComparator)}
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

From the repository root, run `npm install`, `npm run codegen`, then `npm run check`. The workspace intentionally avoids `prepare`; the root build compiles `convex-feedback` before this package so its exported declarations exist before the UI package is type-checked. `prepack` is reserved for package publishing.
