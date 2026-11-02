# Privacy Policy — Feedback

**Last updated: November 2, 2026**

This policy applies to **Feedback**, the universal administrator app for projects using Convex Feedback. The app is maintained by [Moumen-io](https://github.com/Moumen-io). It does not govern other apps that integrate the open-source Convex Feedback packages; those apps have their own privacy practices.

## Information handled by the app

- **Project settings:** Project name, Convex deployment URL, API namespace, authentication provider, and public provider configuration that you enter.
- **Sign-in information:** Authentication sessions and tokens, and limited details such as the last-used sign-in method or email address. Depending on your provider, the app may display your name, email, or profile picture.
- **Project data:** Feedback entries, comments, votes, roadmap items, and related information you view or manage in the connected project.
- **Preferences:** App appearance settings saved on your device.

Project settings and authentication credentials are stored locally using platform storage, including Expo SecureStore for project configurations and session tokens. The app communicates directly with the **Convex deployment you configure** and its selected authentication provider (**Convex Auth or Clerk**). Feedback and account data are stored and managed by those services and the organization operating the connected project, not in a central Feedback app database operated by the maintainer.

Service providers may process technical information, such as IP addresses and request logs, to operate and secure their services. Their handling of that information is governed by their own policies and the connected project's configuration.

## How information is used

Information is used to connect to your projects, authenticate you, verify administrator access, display and manage feedback, and remember your settings. The app does not include advertising or cross-app tracking features, and we do not sell personal information.

## Storage, retention, and deletion

Your saved project configuration remains on your device until you remove the project. Removing a project clears its stored configuration and associated locally managed authentication credentials. Removing the app affects locally stored data according to your device platform's behavior.

**Removing a project from the app does not delete data or accounts in the connected Convex deployment or authentication provider.** The organization running that project controls its server-side data, access, retention, and deletion. Contact that organization to request access to, correction of, or deletion of server-side account or feedback data.

## Security and third parties

The app uses secure local storage for credentials and communicates with your configured services over their network connections. No system can guarantee absolute security. The relevant third-party services are [Convex](https://www.convex.dev/) and, when selected by the project, [Clerk](https://clerk.com/).

## Children

Feedback is intended for authorized project administrators, not children.

## Changes and contact

We may update this policy as the app changes. The date at the top indicates the latest revision.

For questions about the app's privacy practices, contact the maintainer through the [Convex Feedback issue tracker](https://github.com/Moumen-io/convex-feedback/issues/new). **Do not include personal or sensitive data in a public issue.** For data held by a connected project, contact that project's administrator instead.
