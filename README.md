| Package                                                                | Version                                                                                                        | License                                                         | Downloads                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| [convex-feedback](https://www.npmjs.com/package/convex-feedback)       | [![npm version](https://badge.fury.io/js/convex-feedback.svg)](https://badge.fury.io/js/convex-feedback)       | ![NPM License](https://img.shields.io/npm/l/convex-feedback)    | ![NPM Downloads](https://img.shields.io/npm/dw/convex-feedback)    |
| [convex-feedback-ui](https://www.npmjs.com/package/convex-feedback-ui) | [![npm version](https://badge.fury.io/js/convex-feedback-ui.svg)](https://badge.fury.io/js/convex-feedback-ui) | ![NPM License](https://img.shields.io/npm/l/convex-feedback-ui) | ![NPM Downloads](https://img.shields.io/npm/dw/convex-feedback-ui) |

![GitHub forks](https://img.shields.io/github/forks/moumen-io/convex-feedback) ![GitHub Repo stars](https://img.shields.io/github/stars/moumen-io/convex-feedback)

# Convex Feedback

A type-safe Convex component for product feedback, feature requests, bug reports, upvotes, nested comments, comment likes, full-text search, and duplicate suggestions and an optional React and React Native UI.

## Quick Start

### Headless Convex component

```bash
npm install convex-feedback
```

Add the component to your existing Convex app:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import feedback from "convex-feedback/convex.config.js";

const app = defineApp();
app.use(feedback);

export default app;
```

Then expose the feedback API from your host Convex app so you can resolve authentication and permissions there.

See **[convex-feedback](./packages/convex-feedback/README.md)** for the complete integration guide, configuration, API, hooks, authentication, search, comments, and testing.

### React or React Native UI

```bash
npm install convex-feedback convex-feedback-ui
```

```tsx
// React DOM
import { FeedbackScreen } from "convex-feedback-ui";
import "convex-feedback-ui/styles.css";

<FeedbackScreen hooks={feedbackHooks} />;
```

```tsx
// React Native
import { FeedbackScreen } from "convex-feedback-ui/native";

<FeedbackScreen hooks={feedbackHooks} />;
```

`convex-feedback-ui` requires `convex-feedback` and its generated host API/hooks to already be integrated.

See **[convex-feedback-ui](./packages/convex-feedback-ui/README.md)** for web/native setup, theming, localization, compound primitives, and custom component rendering.

## Packages

| Package                                                         | Purpose                                         |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `[convex-feedback](./packages/convex-feedback/README.md)`       | Headless Convex component and typed React hooks |
| `[convex-feedback-ui](./packages/convex-feedback-ui/README.md)` | Optional React DOM and React Native UI          |

The repository also contains a shared example backend and deployable web/native demos under `packages/example-*`.

## Reporting bugs and issues

Use the repository's **GitHub Issues** tab for bugs, regressions, documentation problems, and feature requests for this project.

When reporting a bug, include:

- the affected package (`convex-feedback` or `convex-feedback-ui`);
- package version;
- Convex version;
- React / React Native / Expo version when relevant;
- a minimal reproduction or the smallest relevant code sample;
- expected behavior and actual behavior.

**Do not use the feedback board inside the demo applications to report repository bugs.** The demos exist to exercise the packages; repository issues should be reported through GitHub.

## Repository development

```bash
npm install
npm run codegen
npm run test:all
```

See the individual package READMEs for package-specific development and integration details.

## License

Apache-2.0
