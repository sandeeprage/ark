import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { githubGet, listImportRepositories, seal, unseal } from "@/modules/projects/github-import";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("GitHub repository import boundaries", () => {
  it("rejects a modified import session", () => {
    const key = randomBytes(32);
    const cookie = seal({ actor: "maker", token: "ghu_test" }, key);
    expect(unseal(cookie, key)).toEqual({ actor: "maker", token: "ghu_test" });
    expect(unseal(cookie, randomBytes(32))).toBeNull();
    expect(unseal(cookie.slice(0, -2) + "aa", key)).toBeNull();
  });

  it("lists only permitted public active repositories from the user's installations", async () => {
    const response = vi.fn(async (url: string) => {
      if (url.includes("/user/installations?")) return new Response(JSON.stringify({ installations: [{ id: 41 }] }), { status: 200 });
      return new Response(JSON.stringify({ repositories: [
        { id: 1, name: "tool", full_name: "maker/tool", html_url: "https://github.com/maker/tool", description: "Useful tool", homepage: "https://tool.test", private: false },
        { id: 2, name: "secret", full_name: "maker/secret", html_url: "https://github.com/maker/secret", private: true },
        { id: 3, name: "retired", full_name: "maker/retired", html_url: "https://github.com/maker/retired", private: false, archived: true },
        { id: 4, name: "fake", full_name: "maker/fake", html_url: "https://github.com.attacker.test/maker/fake", private: false },
      ] }), { status: 200 });
    });
    vi.stubGlobal("fetch", response);
    const data = await listImportRepositories("ghu_test");
    expect(data.installations).toBe(1);
    expect(data.repositories.map((repo) => repo.fullName)).toEqual(["maker/tool"]);
    expect(response.mock.calls.every((call) => call[0].startsWith("https://api.github.com/"))).toBe(true);
  });

  it("never forwards a token to an arbitrary GitHub API path", async () => {
    const response = vi.fn();
    vi.stubGlobal("fetch", response);
    await expect(githubGet("https://attacker.test/token", "ghu_test")).rejects.toThrow("Invalid");
    expect(response).not.toHaveBeenCalled();
  });
});
