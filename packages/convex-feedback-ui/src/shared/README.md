# Shared UI contracts

This directory contains platform-neutral contracts used by both web and native UI layers.

- `messages.ts`: typed, overrideable package-owned UI copy. User-generated content is never translated or rewritten.
- `theme.ts`: fallback theme tokens and override contracts.
- `render.ts`: shared render-child types for replaceable primitive implementations.

Do not introduce an i18n runtime dependency here. Localization is provided by typed message injection so hosts can use any localization library.
