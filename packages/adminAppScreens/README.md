# Admin app screens

`convex-feedback-admin-app-screens` owns the reusable admin presentation layer:
settings, account-management shells, inbox/roadmap screens, native feedback
forms and detail screens, data hooks, action helpers, theme primitives, and the
web Shadcn components used by those screens.

Authentication providers, Convex provider setup, and routing remain in each
app variant. Provider-owned account UI is passed to the shared modal:

```tsx
import {
  AdminAccountModal,
  AdminSettingsScreen,
} from "convex-feedback-admin-app-screens/web";

<AdminSettingsScreen onManageAccount={() => setAccountOpen(true)} />

<AdminAccountModal open={accountOpen} onOpenChange={setAccountOpen}>
  <ProviderAccountComponent />
</AdminAccountModal>;
```

Native variants can wrap their auth/router scaffold with
`NativeAppProviders`. It provides `SafeAreaProvider` and the shared admin theme
context. Native color selection and predefined color selection use Expo UI
controls; the iOS build uses the native SwiftUI color picker.

The package exports the copied Shadcn setup at `components.json`, all UI
components under `convex-feedback-admin-app-screens/web/ui/*`, and the shared
stylesheet at `convex-feedback-admin-app-screens/web/styles.css`.
