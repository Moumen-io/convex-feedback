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
`ImageSourcePropType` values for the create, back, close, and filter actions.
Missing Android images fall back to text labels.

> [!WARNING]
> If the filter toolbar button is intermittently broken, especially on iOS 26+, pass `Host` from `@expo/ui/swift-ui` to `BottomToolbarWrapper`. This wraps every bottom toolbar:
>
> ```tsx
> import { Host } from "@expo/ui/swift-ui";
>
> <FeedbackScreen hooks={feedbackHooks} BottomToolbarWrapper={Host} />;
> ```

Use the same prop on `FeedbackStackLayout` for routed navigation.

The existing `FeedbackScreen` remains the self-contained API for conditional
in-screen navigation.

`RoadmapScreen` is also exported from this entry point for public roadmap
browsing. It uses the current Expo Router stack by default, including its
native Stack title, search bar, and toolbar back action; pass `useStack={false}`
for the plain React Native implementation. Pass `onEntryOpen` for host navigation and
`onUnauthenticated` for the host's sign-in UI. For real Expo Router pages, use
`RoadmapStackLayout` with `RoadmapBoardScreen` and `RoadmapItemScreen`, just
as the routed feedback integration uses its own stack layout.

### Roadmap insets and bottom toolbar

The stack-enabled `RoadmapScreen` and `RoadmapStackLayout` default to a
transparent native header. Their board reserves the measured stack header
height automatically. If the native-stack header context is unavailable, the
package falls back to 44 points on iOS or 56 points on Android, plus the top
safe-area inset. If `headerTransparent` is `false`, the stack already places
the board below the header and the automatic `topInset` is `0`. Set
`topInset` to provide the header space yourself; an explicit value wins,
including `0`.

`bottomInset` is the total bottom space occupied by host navigation chrome,
including the safe area. When it is omitted, direct `RoadmapBoard` and
`RoadmapScreenContent` usage reserves the bottom safe-area inset. The
stack-enabled roadmap additionally renders its native bottom search toolbar
where Expo Router provides `Stack.Toolbar.SearchBarSlot` (iOS 26 and newer)
and includes the standard 44-point toolbar height in the default bottom inset.
It does not render an empty bottom toolbar on Android or older iOS versions.

Pass `bottomInset` when the host supplies an overlaying toolbar or tab bar and
include both the overlay height and the safe-area inset. An explicit value
replaces the default, including `0`. NativeTabs normally bounds the screen
content above its tab bar, so NativeTabs consumers should omit `bottomInset`.

For example, a host-owned overlay can provide its total occupied space:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { bottom } = useSafeAreaInsets();

<RoadmapStackLayout
  hooks={feedbackHooks}
  bottomInset={bottom + customToolbarHeight}
/>;
```

The routed entry page includes an explicit Stack back action so navigation into
feedback from a roadmap item remains reversible even when the host uses nested
Expo Router stacks.
