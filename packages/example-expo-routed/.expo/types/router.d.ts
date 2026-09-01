/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/feedback`; params?: Router.UnknownInputParams; } | { pathname: `/feedback/new`; params?: Router.UnknownInputParams; } | { pathname: `/feedback/[entryId]`, params: Router.UnknownInputParams & { entryId: string | number; } } | { pathname: `/feedback/new/[entryId]`, params: Router.UnknownInputParams & { entryId: string | number; } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/feedback`; params?: Router.UnknownOutputParams; } | { pathname: `/feedback/new`; params?: Router.UnknownOutputParams; } | { pathname: `/feedback/[entryId]`, params: Router.UnknownOutputParams & { entryId: string; } } | { pathname: `/feedback/new/[entryId]`, params: Router.UnknownOutputParams & { entryId: string; } };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `/feedback${`?${string}` | `#${string}` | ''}` | `/feedback/new${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/feedback`; params?: Router.UnknownInputParams; } | { pathname: `/feedback/new`; params?: Router.UnknownInputParams; } | `/feedback/${Router.SingleRoutePart<T>}${`?${string}` | `#${string}` | ''}` | `/feedback/new/${Router.SingleRoutePart<T>}${`?${string}` | `#${string}` | ''}` | { pathname: `/feedback/[entryId]`, params: Router.UnknownInputParams & { entryId: string | number; } } | { pathname: `/feedback/new/[entryId]`, params: Router.UnknownInputParams & { entryId: string | number; } };
    }
  }
}
