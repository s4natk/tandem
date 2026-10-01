import { describe, expect, it } from "vitest";
import {
  createCardSchema,
  loginSchema,
  moveCardSchema,
  signupSchema,
  updateCardSchema,
} from "@collab/shared";

describe("shared schemas", () => {
  it("requires a strong-ish password on signup", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "short", name: "X" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.com", password: "longenough", name: "X" }).success).toBe(true);
  });

  it("rejects invalid login emails", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("requires a version token on card updates (optimistic concurrency)", () => {
    expect(updateCardSchema.safeParse({ title: "x", version: 0 }).success).toBe(true);
    expect(updateCardSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("requires version + target column on card moves", () => {
    expect(
      moveCardSchema.safeParse({
        cardId: "c",
        toColumnId: "col",
        toPosition: 0,
        version: 1,
      }).success,
    ).toBe(true);
    expect(
      moveCardSchema.safeParse({ cardId: "c", toPosition: 0, version: 1 }).success,
    ).toBe(false);
  });

  it("accepts well-formed card creation payloads", () => {
    expect(
      createCardSchema.safeParse({ columnId: "col-1", title: "Hello" }).success,
    ).toBe(true);
  });
});
