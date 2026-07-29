import { describe, expect, it } from "vitest";
import { getNewRunDiceFrameRect } from "../src/new-run-intro";

describe("new-run dice intro frame bounds", () => {
  it("uses the measured, non-uniform bands at every row transition", () => {
    expect(getNewRunDiceFrameRect(0)).toEqual({ sx: 0, sy: 0, sw: 253, sh: 231 });
    expect(getNewRunDiceFrameRect(3)).toEqual({ sx: 768, sy: 0, sw: 256, sh: 231 });
    expect(getNewRunDiceFrameRect(4)).toEqual({ sx: 0, sy: 236, sw: 253, sh: 237 });
    expect(getNewRunDiceFrameRect(7)).toEqual({ sx: 768, sy: 236, sw: 256, sh: 237 });
    expect(getNewRunDiceFrameRect(8)).toEqual({ sx: 0, sy: 478, sw: 253, sh: 228 });
    expect(getNewRunDiceFrameRect(11)).toEqual({ sx: 768, sy: 478, sw: 256, sh: 228 });
    expect(getNewRunDiceFrameRect(12)).toEqual({ sx: 0, sy: 711, sw: 253, sh: 233 });
    expect(getNewRunDiceFrameRect(15)).toEqual({ sx: 768, sy: 711, sw: 256, sh: 233 });
  });
});
