import { safeReturnPath } from "./validation";

export function configuredAuthOrigin(value = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  try {
    const url = new URL(value ?? "");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function loginDestination(origin: string, next: unknown, error?: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("next", safeReturnPath(next));
  if (error) url.searchParams.set("error", error);
  return url;
}
export function callbackFailure(code?: string) {
  if (code === "pkce_code_verifier_not_found" || code === "flow_state_not_found") return "browser";
  if (code === "flow_state_expired" || code === "bad_code_verifier" || code === "validation_failed")
    return "expired";
  return "callback";
}
export function signInErrorMessage(error: unknown) {
  const messages: Record<string, string> = {
    setup: "Sign-in configuration is incomplete.",
    denied: "Sign-in was cancelled. You can try again.",
    browser:
      "Sign-in started in another browser or domain. Open ARK in one browser and start sign-in again there.",
    expired: "This sign-in link expired or was already used. Start a fresh sign-in.",
    profile: "You signed in, but your ARK profile could not be loaded. Please try again shortly.",
    provider: "The sign-in provider is temporarily unavailable. Please try again.",
  };
  return typeof error === "string"
    ? (messages[error] ?? "Sign-in wasn’t completed. You can try again.")
    : "Sign-in wasn’t completed. You can try again.";
}
