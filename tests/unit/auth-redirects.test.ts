import { describe, it, expect } from "vitest";
import {
  configuredAuthOrigin,
  loginDestination,
  callbackFailure,
  signInErrorMessage,
} from "@/modules/auth/redirects";
import { safeReturnPath } from "@/modules/auth/validation";
describe("OAuth origin and recovery", () => {
  it("accepts canonical HTTPS and local development origins", () => {
    expect(configuredAuthOrigin("https://ark.example.test/")).toBe("https://ark.example.test");
    expect(configuredAuthOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });
  it.each([
    "https://user:password@example.test",
    "https://example.test/path",
    "http://example.test",
    "https://example.test?next=bad",
    "invalid",
  ])("rejects malformed configuration %s", (value) =>
    expect(configuredAuthOrigin(value)).toBeNull(),
  );
  it("preserves URL-encoded internal search queries", () =>
    expect(safeReturnPath("/search?q=hello%20world")).toBe("/search?q=hello%20world"));
  it("still rejects encoded path redirects", () =>
    expect(safeReturnPath("/%2f%2fevil.test?q=x")).toBe("/explore"));
  it("preserves destination in recoverable login errors", () => {
    const url = loginDestination("https://ark.example.test", "/publish", "browser");
    expect(url.searchParams.get("next")).toBe("/publish");
    expect(url.origin).toBe("https://ark.example.test");
  });
  it("maps missing verifier and expired flow to distinct messages", () => {
    expect(callbackFailure("pkce_code_verifier_not_found")).toBe("browser");
    expect(callbackFailure("flow_state_expired")).toBe("expired");
    expect(signInErrorMessage("browser")).toContain("another browser");
  });
});
