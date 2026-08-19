# React web UI

The web layer is CSS-framework agnostic. Import `convex-feedback-ui/styles.css` for the default appearance or omit it and style the semantic classes yourself.

Default selectors are scoped beneath `.cf-board` and use low-specificity `:where(...)` selectors so host CSS, CSS Modules, Tailwind classes, or inline styles can override them without a specificity fight.

Use compound primitives for custom layouts or `FeedbackScreen` for the prebuilt experience. Interactive leaf primitives accept render-function children to replace their visual implementation while retaining typed state and actions.
