# Admin app screens

This package contains the provider-neutral settings and account-management
surfaces used by the admin app variants.

The platform entry points intentionally keep authentication out of the package:

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

The Clerk, WorkOS, or other provider-specific prebuilt component can be passed
as the modal child. This keeps account UI and settings layout shared while
leaving auth state, routing, and mutations in each app variant.

For Tailwind v4 consumers, include the package source in the host stylesheet's
`@source` list so the package's utility classes are included in the build.
