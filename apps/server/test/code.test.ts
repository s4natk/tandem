import { describe, expect, it } from "vitest";
import { generateRoomCode } from "../src/utils/code.js";

describe("generateRoomCode", () => {
  it("returns 8-character codes", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[a-z2-9]{8}$/);
    }
  });

  it("does not produce visually-confusing characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).not.toMatch(/[01ilo]/);
    }
  });
});
