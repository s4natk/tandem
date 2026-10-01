import { describe, expect, it } from "vitest";
import {
  POSITION_STEP,
  needsRebalance,
  positionBetween,
  positionForAppend,
} from "../src/utils/position.js";

describe("position", () => {
  it("appends at the end with a constant step", () => {
    expect(positionForAppend(null)).toBe(POSITION_STEP);
    expect(positionForAppend(2048)).toBe(2048 + POSITION_STEP);
  });

  it("places a card between two siblings at the midpoint", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });

  it("places at the head when prev is null", () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });

  it("places at the tail when next is null", () => {
    expect(positionBetween(1024, null)).toBe(1024 + POSITION_STEP);
  });

  it("uses the default step when both ends are null", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
  });

  it("flags rebalance when two siblings collapse close together", () => {
    expect(needsRebalance(1, 1.0000001)).toBe(true);
    expect(needsRebalance(1, 2)).toBe(false);
  });
});
