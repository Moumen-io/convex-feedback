/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as entries from "../entries.js";
import type * as helpers from "../helpers.js";
import type * as migrations from "../migrations.js";
import type * as model from "../model.js";
import type * as roadmap from "../roadmap.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  admin: typeof admin;
  comments: typeof comments;
  crons: typeof crons;
  entries: typeof entries;
  helpers: typeof helpers;
  migrations: typeof migrations;
  model: typeof model;
  roadmap: typeof roadmap;
  types: typeof types;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
