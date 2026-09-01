# Native layer

Import this layer only from `convex-feedback-ui/expo`.

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

## Routed screens

Use `FeedbackStackLayout` with `FeedbackBoardScreen`,
`FeedbackCreateStackLayout`, `FeedbackEntryScreen`, and
`CreateFeedbackScreen` when board state should be shared across real Expo
Router routes. Consumer applications must create the corresponding board and
entry files plus a nested create directory containing `_layout.tsx`,
`index.tsx`, and `[entryId].tsx`, because Expo Router discovers pages from the
application's route directory.

Re-export `feedbackStackSettings` from the route layout as
`unstable_settings` so a deep link to the create modal anchors the board behind
it. Re-export `feedbackCreateStackSettings` from the nested create layout so
suggested entries retain the form behind them. Use
`createFeedbackStackSettings(routes)` when overriding the default route names.

Toolbar actions retain their package-provided SF Symbols on iOS. Pass
`androidToolbarIcons` to `FeedbackScreen` or `FeedbackStackLayout` with Android
`ImageSourcePropType` values for the create, back, and close actions. Missing
Android images fall back to text labels.

The existing `FeedbackScreen` remains the self-contained API for conditional
in-screen navigation.
