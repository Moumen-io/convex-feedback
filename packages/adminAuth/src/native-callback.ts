import * as AuthSession from "expo-auth-session";
import { NATIVE_AUTH_CALLBACK_PATH } from "./native-callback-constants.js";

/**
 * Re-export the path used by every native auth adapter and setup screen so
 * consumers can inspect the same callback source when needed.
 */
export { NATIVE_AUTH_CALLBACK_PATH };

let nativeAuthCallbackUrl: string | undefined;

export function getNativeAuthCallbackUrl(): string {
  nativeAuthCallbackUrl ??= AuthSession.makeRedirectUri({
    path: NATIVE_AUTH_CALLBACK_PATH,
  });
  return nativeAuthCallbackUrl;
}
