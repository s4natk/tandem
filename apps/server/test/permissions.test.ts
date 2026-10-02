import { describe, expect, it } from "vitest";
import { ForbiddenError } from "../src/errors/index.js";
import { assertRoomEditor } from "../src/modules/rooms/permissions.js";

describe("assertRoomEditor", () => {
  it("allows owners and editors to change the board", () => {
    expect(() => assertRoomEditor("OWNER")).not.toThrow();
    expect(() => assertRoomEditor("EDITOR")).not.toThrow();
  });

  it("rejects viewers", () => {
    expect(() => assertRoomEditor("VIEWER")).toThrow(ForbiddenError);
  });
});
