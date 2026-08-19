# convex-feedback-ui agent instructions

This package is optional presentation only.

- Never import this package from `convex-feedback`.
- Keep web and native concepts aligned unless the platform genuinely requires a difference.
- Native implementation code belongs under `src/native` only.
- Do not add Tailwind, NativeWind, a CSS-in-JS runtime, or an i18n runtime dependency.
- Web defaults must remain low-specificity and host-overridable. Do not use `!important`.
- Keep theme precedence: local prop/style, then provider theme, then fallback.
- All package-owned visible text belongs in `src/shared/messages.ts`. Do not localize user content.
- Keep `FeedbackMessages` fully typed. Copy overrides are partial, but the merged result must always be complete.
- Containers accept arbitrary children. Interactive leaf controls should keep typed render-function children so hosts can replace their visual implementation without reimplementing state wiring.
- Do not replace render-function children with a DOM-only clone/asChild abstraction.
- Entry reactions must use upvote language/visuals. Comment reactions must use like language/visuals.
- Do not eagerly render reply-query components. `ReplyList` is mounted only after expansion.
- `transformComments` may reorder loaded items only; do not imply it changes global server pagination order.
- Keep the prebuilt screen optional. New backend capabilities should first be exposed headlessly, then through primitives, then through the screen.
- Add tests when changing messages, theme merging, or shared contracts.
