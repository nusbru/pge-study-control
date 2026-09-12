// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getRewrittenUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

afterEach(() => { vi.unstubAllEnvs(); });

describe("runtime API proxy", () => {
  it("reads the destination at request time instead of freezing it when the module is loaded", () => {
    const request = new NextRequest("https://study.example.com/api/auth/csrf");
    vi.stubEnv("API_INTERNAL_URL", "http://api:8080");
    expect(getRewrittenUrl(proxy(request))).toBe("http://api:8080/api/auth/csrf");

    vi.stubEnv("API_INTERNAL_URL", "http://deployed-backend:8080");
    expect(getRewrittenUrl(proxy(request))).toBe("http://deployed-backend:8080/api/auth/csrf");
  });

  it("preserves the API path and query string while replacing the public origin", () => {
    vi.stubEnv("API_INTERNAL_URL", "http://deployed-backend:8080/");
    const request = new NextRequest("https://study.example.com/api/sessions?page=2&subject=Direito%20Civil&subject=Tribut%C3%A1rio");
    expect(getRewrittenUrl(proxy(request))).toBe("http://deployed-backend:8080/api/sessions?page=2&subject=Direito%20Civil&subject=Tribut%C3%A1rio");
  });

  it("keeps the local development fallback when no backend URL is configured", () => {
    vi.stubEnv("API_INTERNAL_URL", undefined);
    expect(getRewrittenUrl(proxy(new NextRequest("http://localhost:3000/api/health"))))
      .toBe("http://127.0.0.1:5080/api/health");
  });

  it.each([
    ["/api", true],
    ["/api/auth/csrf", true],
    ["/api/sessions?page=2", true],
    ["/health", false],
    ["/dashboard", false],
    ["/api-other", false],
    ["/_next/static/app.js", false],
  ])("matches %s: %s", (url, expected) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(expected);
  });
});
