/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as BrevoEmailOTP from "../BrevoEmailOTP.js";
import type * as auth from "../auth.js";
import type * as authGate from "../authGate.js";
import type * as calls from "../calls.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as emailActions from "../emailActions.js";
import type * as emails from "../emails.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as landing from "../landing.js";
import type * as nudges from "../nudges.js";
import type * as ops from "../ops.js";
import type * as payments from "../payments.js";
import type * as paystack from "../paystack.js";
import type * as referrals from "../referrals.js";
import type * as settings from "../settings.js";
import type * as telegram from "../telegram.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  BrevoEmailOTP: typeof BrevoEmailOTP;
  auth: typeof auth;
  authGate: typeof authGate;
  calls: typeof calls;
  crons: typeof crons;
  dashboard: typeof dashboard;
  emailActions: typeof emailActions;
  emails: typeof emails;
  files: typeof files;
  http: typeof http;
  landing: typeof landing;
  nudges: typeof nudges;
  ops: typeof ops;
  payments: typeof payments;
  paystack: typeof paystack;
  referrals: typeof referrals;
  settings: typeof settings;
  telegram: typeof telegram;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
