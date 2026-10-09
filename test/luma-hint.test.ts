import { describe, expect, it } from "vitest";
import { suggestReroll } from "../src/luma-hint";

describe("Ask Luma hints", () => {
  it.each([
    [[3, 3, 3, 3, 1], [4]],
    [[2, 5, 5, 2, 6], [4]],
    [[4, 4, 1, 4, 6], [2, 4]],
    [[6, 6, 1, 2, 4], [2, 3, 4]],
    [[1, 2, 3, 4, 6], [4]],
    [[5, 3, 6, 4, 6], [4]],
    [[1, 3, 5, 6, 2], [0, 1, 2, 4]]
  ])("for %s suggests rerolling %s", (dice, reroll) => {
    expect(suggestReroll(dice, 2).reroll).toEqual(reroll);
  });

  it("keeps made hands and winning hands", () => {
    expect(suggestReroll([1, 2, 3, 4, 5], 2).reroll).toEqual([]);
    expect(suggestReroll([2, 2, 3, 3, 3], 2).reroll).toEqual([]);
    expect(suggestReroll([1, 1, 2, 4, 6], 2, true).message).toMatch(/clears the round/);
    expect(suggestReroll([1, 1, 2, 4, 6], 0).reroll).toEqual([]);
  });
});
