import { describe, expect, it } from "vitest";
import { LUMA_CELL, LUMA_CLIPS, LUMA_POSES, lumaFrameRect } from "../src/luma";

describe("Lady Luma atlas", () => {
  it("maps poses onto the uniform atlas grid", () => {
    expect(lumaFrameRect("idle", 0)).toEqual({ sx: 0, sy: 0, sw: LUMA_CELL.width, sh: LUMA_CELL.height });
    expect(lumaFrameRect("dice", 2)).toEqual({ sx: 2 * LUMA_CELL.width, sy: 2 * LUMA_CELL.height, sw: LUMA_CELL.width, sh: LUMA_CELL.height });
    expect(lumaFrameRect("sad", 5)).toEqual({ sx: 5 * LUMA_CELL.width, sy: 3 * LUMA_CELL.height, sw: LUMA_CELL.width, sh: LUMA_CELL.height });
  });

  it("clamps frames that do not exist", () => {
    expect(lumaFrameRect("happy", 9).sx).toBe(3 * LUMA_CELL.width);
  });

  it("only uses frames that exist in every clip", () => {
    Object.entries(LUMA_CLIPS).forEach(([name, steps]) => {
      steps.forEach(([pose, frame, ms]) => {
        expect(LUMA_POSES[pose as keyof typeof LUMA_POSES], `${name} pose`).toBeDefined();
        expect(frame, `${name} frame`).toBeLessThan(LUMA_POSES[pose as keyof typeof LUMA_POSES].frames);
        expect(ms, `${name} duration`).toBeGreaterThan(0);
      });
    });
  });
});
