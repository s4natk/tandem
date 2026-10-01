import { describe, expect, it } from "vitest";
import { pickAvatarColor } from "../src/utils/avatar.js";

describe("pickAvatarColor", () => {
  it("returns a hex color from the palette", () => {
    expect(pickAvatarColor("alice@example.com")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is deterministic for the same input", () => {
    const a = pickAvatarColor("user-1");
    const b = pickAvatarColor("user-1");
    expect(a).toBe(b);
  });

  it("returns different colors for different seeds (mostly)", () => {
    const colors = new Set(
      Array.from({ length: 50 }, (_, i) => pickAvatarColor(`user-${i}`)),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
