import { describe, expect, it } from "vitest";
import { evaluate, handTier, rollFive, scoringIndices, targetFor } from "../src/game-rules";

describe("dice hands", () => {
  it.each([
    [[1, 2, 3, 4, 5], "straight"],
    [[2, 2, 3, 3, 3], "full"],
    [[6, 6, 6, 6, 2], "four"],
    [[4, 4, 4, 4, 4], "five"],
    [[1, 1, 2, 3, 6], "pair"]
  ] as const)("recognizes %s as %s", (dice, handId) => {
    expect(evaluate(dice).id).toBe(handId);
  });
});

describe("run rules", () => {
  it("uses deterministic target progression", () => {
    expect(targetFor(1)).toBe(110);
    expect(targetFor(25)).toBeGreaterThan(targetFor(24));
  });

  it("rolls exactly five legal dice", () => {
    expect(rollFive(() => 0.999)).toEqual([6, 6, 6, 6, 6]);
  });
});

describe("scoring dice", () => {
  it.each([
    [[1, 1, 2, 3, 6], [0, 1]],
    [[4, 2, 4, 2, 6], [0, 1, 2, 3]],
    [[5, 3, 5, 1, 5], [0, 2, 4]],
    [[6, 6, 2, 6, 6], [0, 1, 3, 4]],
    [[2, 3, 4, 5, 6], [0, 1, 2, 3, 4]],
    [[1, 3, 4, 5, 6], [0, 1, 2, 3, 4]]
  ])("highlights the dice that form %s", (dice, expected) => {
    expect(scoringIndices(dice)).toEqual(expected);
  });

  it("ranks hands into visual tiers", () => {
    expect(handTier(evaluate([1, 1, 2, 3, 6]))).toBe("common");
    expect(handTier(evaluate([2, 3, 4, 5, 6]))).toBe("rare");
    expect(handTier(evaluate([4, 4, 4, 4, 4]))).toBe("legendary");
  });
});
