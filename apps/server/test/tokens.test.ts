import { beforeAll, describe, expect, it } from "vitest";

// Tests need env defaults *before* importing modules that read process.env.
beforeAll(() => {
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-test-refresh-secret";
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.REDIS_URL ??= "redis://localhost:6379";
});

describe("tokens", () => {
  it("signs and verifies an access token round-trip", async () => {
    const { signAccessToken, verifyAccessToken } = await import(
      "../src/modules/auth/tokens.js"
    );
    const token = signAccessToken({
      sub: "user-1",
      email: "a@b.com",
      name: "Alice",
    });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("a@b.com");
  });

  it("hashes refresh tokens deterministically", async () => {
    const { hashRefreshToken } = await import("../src/modules/auth/tokens.js");
    expect(hashRefreshToken("a")).toBe(hashRefreshToken("a"));
    expect(hashRefreshToken("a")).not.toBe(hashRefreshToken("b"));
  });

  it("parses durations", async () => {
    const { parseDurationMs } = await import("../src/modules/auth/tokens.js");
    expect(parseDurationMs("1s")).toBe(1000);
    expect(parseDurationMs("2m")).toBe(120_000);
    expect(parseDurationMs("1h")).toBe(3_600_000);
    expect(parseDurationMs("1d")).toBe(86_400_000);
    expect(() => parseDurationMs("bogus")).toThrow();
  });
});
