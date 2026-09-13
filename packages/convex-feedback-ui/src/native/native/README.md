# Native layer

Import this layer only from `convex-feedback-ui/native`.

The native layer uses React Native core primitives and the shared `FeedbackMessages` / `FeedbackTheme` contracts. It intentionally does not depend on NativeWind or Expo UI.

To replace a control with Expo UI, use render-function children on an interactive leaf:

```tsx
<Comment.Like onToggle={setLiked}>
  {({ active, count, toggle }) => (
    <YourExpoUiControl active={active} count={count} onPress={toggle} />
  )}
</Comment.Like>
```

Containers such as `FeedbackEntry.Content`, `FeedbackForm.Root`, and `Comment.Children` accept arbitrary children, so custom Expo UI fields/buttons can also be placed directly inside the compound layout.

`RoadmapScreen` provides the public roadmap, groups items by delivery stage,
and renders attached entries with the existing `EntryCard` and `EntryDetail`
views. Pass `onUnauthenticated` to handle auth when an anonymous visitor votes
or comments.

The exported `RoadmapBoard` is the reusable admin-style horizontal board
layout. Render it inside `RoadmapProvider` and supply ordered stages plus a
`renderItem` callback to share the same column scrolling behavior while
customizing cards for an admin or public surface. The `colors` props on
`RoadmapBoard` and `RoadmapBoardCard` are deprecated; configure the provider's
`theme` instead.
