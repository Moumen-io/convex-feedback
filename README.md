| Package                                                                | Version                                                                                                        | Convex                                                                                                                            | License                                                                                                             | Downloads                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [convex-feedback](https://www.npmjs.com/package/convex-feedback)       | [![npm version](https://badge.fury.io/js/convex-feedback.svg)](https://badge.fury.io/js/convex-feedback)       | [![Convex Component](https://www.convex.dev/components/badge/convex-feedback)](https://www.convex.dev/components/convex-feedback) | [![NPM License](https://img.shields.io/npm/l/convex-feedback)](https://www.npmjs.com/package/convex-feedback)       | [![NPM Downloads](https://img.shields.io/npm/dm/convex-feedback)](https://www.npmjs.com/package/convex-feedback)       |
| [convex-feedback-ui](https://www.npmjs.com/package/convex-feedback-ui) | [![npm version](https://badge.fury.io/js/convex-feedback-ui.svg)](https://badge.fury.io/js/convex-feedback-ui) | [![Convex Component](https://www.convex.dev/components/badge/convex-feedback)](https://www.convex.dev/components/convex-feedback) | [![NPM License](https://img.shields.io/npm/l/convex-feedback-ui)](https://www.npmjs.com/package/convex-feedback-ui) | [![NPM Downloads](https://img.shields.io/npm/dm/convex-feedback-ui)](https://www.npmjs.com/package/convex-feedback-ui) |

GitHub forks GitHub Repo stars

[Vite demo](https://convex-feedback-vite.vercel.app/) • [Expo demo](https://convex-feedback-expo.vercel.app/) • [React Native demo](https://convex-feedback-native.vercel.app/)

# Convex Feedback

A type-safe Convex component for product feedback, feature requests, bug reports, upvotes, nested comments, comment likes, full-text search, duplicate suggestions, and optional React and React Native UI. It gives your app a ready-made feedback data model and typed queries and mutations for collecting, discussing, searching, and managing user feedback without requiring you to build those backend workflows yourself. Authentication, user profiles, and app-specific permissions remain in your host app.

## Quick Start

### Headless Convex component

- Product feedback, feature requests, and bug reports.
- Upvotes, nested comments, and comment likes.
- Full-text search and duplicate suggestions.
- Roadmap and admin workflows.
- Host-controlled authentication, permissions, and optional rate limiting.
- Typed Convex functions and React hooks for building a custom interface.

Use `convex-feedback` when you want to add a feedback board or roadmap to an existing Convex app. The component stores feedback entries, comments, reactions, and roadmap data in Convex, while your app decides who the current actor is and which actors are admins. You can use the generated host API from your own UI, or pair it with the optional `convex-feedback-ui` package below.

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

Start Convex once to generate the component references, then expose the feedback API from a host module. In that wrapper, resolve the authenticated actor from your app's auth provider and return a stable actor ID plus an admin flag when applicable. This keeps authentication and authorization in your app while `convex-feedback` provides the feedback operations and data model.

```bash
npx convex dev
```

Expose the generated functions from a host module. This simplified example shows the complete shape of the wrapper, including the public and admin APIs, configuration, rate-limit groups, and lifecycle hooks. Replace the comments with your app's auth, moderation, rate-limiting, and notification logic.

```ts
// convex/feedback.ts
import { exposeFeedbackApi } from "convex-feedback";
import { components } from "./_generated/api";

export const {
  isAdmin,
  isAuthenticated,
  listEntries,
  listUserEntries,
  getEntry,
  searchEntries,
  findSimilarEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  setEntryStatus,
  adminListEntries,
  adminGetEntry,
  adminSearchEntries,
  setEntryPriority,
  setEntryUpvote,
  listComments,
  listUserComments,
  listUserReactions,
  createComment,
  updateComment,
  deleteComment,
  setCommentLike,
  listRoadmap,
  getRoadmapItem,
  searchRoadmap,
  createRoadmap,
  createRoadmapForEntry,
  updateRoadmap,
  deleteRoadmap,
  moveRoadmapItem,
  attachFeedbackToRoadmap,
  detachFeedbackFromRoadmap,
  listRoadmapFeedback,
} = exposeFeedbackApi(components.feedback, {
  actor: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;

    return {
      id: identity.tokenIdentifier,
      // Look up your app's admin role here.
      isAdmin: false,
    };
  },
  config: {
    entries: {
      enabledKinds: ["feedback", "feature_request", "bug_report"],
      defaultStatus: "open",
      defaultSort: "top",
      maxPageSize: 50,
      editableByAuthor: true,
    },
    comments: {
      maxDepth: 5,
      maxPageSize: 50,
      defaultSort: "top",
      editableByAuthor: true,
      deletableByAuthor: true,
    },
    search: {
      duplicateSuggestions: true,
      duplicateSuggestionLimit: 5,
      defaultLimit: 20,
      maxLimit: 50,
    },
    limits: {
      titleLength: 160,
      bodyLength: 10_000,
      commentLength: 5_000,
    },
    rateLimiting: {
      limitAdmins: false,
      behavior: "throw",
      // Or return a custom rejection value instead of throwing. This requires additional configuration on the frontend to handle the returned value.
      // behavior: "return",
      // returns: v.object({ kind: v.string(), reason: v.string() }),
    },
  },
  rateLimiters: {
    createEntry: async (ctx, actorId) => {},
    createComment: async (ctx, actorId) => {},
    editContent: async (ctx, actorId) => {},
    reactions: async (ctx, actorId) => {},
  },
  callbacks: {
    rejection: { behavior: "throw" },
    // Or return a custom rejection value instead of throwing. This requires additional configuration on the frontend to handle the returned value.
    // rejection: {
    //   behavior: "return",
    //   returns: v.object({ kind: v.string(), reason: v.string() }),
    // },
    entries: {
      beforeCreate: async (ctx, event, helpers) => {
        // Example: Moderate or sanitize event.input before it is stored.
        const titleContainsProfanity = checkForProfanity(event.input.title);
        const bodyContainsProfanity = checkForProfanity(event.input.body);

        if (titleContainsProfanity || bodyContainsProfanity) {
          helpers.reject({
            kind: "profanity_detected",
            reason: "Entry content contains profanity",
          });
        }
      },
      afterCreate: async (ctx, event) => {
        // Example: Send a notification about the new feedback entry to the admins.
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendFeedbackNotificationToAdmins,
          {
            title: event.entry.title,
            body: event.entry.body,
          },
        );
      },
    },
    comments: {
      beforeCreate: async (ctx, event, helpers) => {
        // Example: Moderate or sanitize event.input before it is stored.
        const bodyContainsProfanity = checkForProfanity(event.input.body);

        if (bodyContainsProfanity) {
          helpers.reject({
            kind: "profanity_detected",
            reason: "Comment content contains profanity",
          });
        }
      },
      afterCreate: async (ctx, event) => {
        // Notify the entry author about the comment.
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendCommentNotificationToAuthor,
          {
            userId: event.actor.id,
            body: event.comment.body,
          },
        );
      },
    },
    reactions: {
      afterChange: async (ctx, event) => {
        // Example: Send a notification when an upvote or like changes.
        if (event.transition === "removed") return;

        await ctx.scheduler.runAfter(
          0,
          // fetches the target comment/entry and sends a notification to the author
          internal.notifications.sendReactionNotificationToAuthor,
          {
            docId: event.type === "" ? event.entryId : event.commentId,
            type: event.type,
          },
        );
      },
    },
  },
});
```

See **[convex-feedback](./packages/convex-feedback/README.md)** for the complete integration guide, configuration, API, hooks, authentication, search, comments, and testing.

For host-side lifecycle callbacks, rejection modes, transaction behavior, and
notification scheduling, see the [lifecycle callback reference](./packages/convex-feedback/README.md#lifecycle-callbacks).

### React or React Native UI

- Prebuilt feedback board and public roadmap screens.
- React DOM, React Native, and Expo Router entry points.
- Compound primitives for custom layouts.
- Configurable themes, colors, copy, and localization.
- Host-controlled sign-in handling and navigation callbacks.
- Custom component rendering when the prebuilt screens are not enough.

| Expo                                                                                                | React Native                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| ![Expo](https://raw.githubusercontent.com/Moumen-io/convex-feedback/main/docs/screenshots/expo.png) | ![React Native](https://raw.githubusercontent.com/Moumen-io/convex-feedback/main/docs/screenshots/native.png) |

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

### Admin panel

Fork either standalone Clerk reference app under [`apps/admin/withClerk`](./apps/admin/withClerk/README.md): a Vite + Tailwind + shadcn web app or an Expo app using native tabs. Expose the complete host feedback API, return `isAdmin` from the host actor resolver, copy the selected app's `.env.example`, and set its Convex and Clerk variables before deploying. Priority remains internal; roadmap data is available through the public roadmap API and does not alter the public feedback UI.

For a single universal Expo/native build that can connect to multiple projects,
use [`apps/admin/universal`](./apps/admin/universal/README.md). It collects a
Convex deployment URL, API namespace, public auth configuration, and enabled
admin sign-in methods at runtime. It stores the configuration in SecureStore,
tests the configured `api.<namespace>.isAdmin` endpoint before saving, and
reuses the shared native admin screens. It supports Convex Auth and Clerk today;
Auth0, WorkOS, and generic OIDC are adapter placeholders.

## Packages

| Package                                                       | Purpose                                         |
| ------------------------------------------------------------- | ----------------------------------------------- |
| [convex-feedback](./packages/convex-feedback/README.md)       | Headless Convex component and typed React hooks |
| [convex-feedback-ui](./packages/convex-feedback-ui/README.md) | Optional React DOM and React Native UI          |

The repository also contains a shared example backend and deployable public web/native demos under `packages/example-*`, plus the standalone [Clerk admin clients](./apps/admin/withClerk/README.md).
The universal app's runtime auth/configuration package is documented in
[`packages/adminAuth`](./packages/adminAuth/README.md).

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
