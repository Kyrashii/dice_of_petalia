import { describe, expect, it, vi } from "vitest";
import { charmFamilies, variants } from "../src/game-content";
import { handsData, levelPetals } from "../src/game-rules";
import { charmTotals, createRunState, emptyBonus } from "../src/run-state";
import { normalizeSave } from "../src/run-save";
import { createRerollCharmEffects } from "../src/reroll-charm-effects";

const family = (name: string) => charmFamilies.findIndex(f => f.name === name);
const variant = (label: string) => variants.findIndex(v => v.label === label);
const charm = (name: string, label: string, rank = 1) => {
  const fi = family(name), vi = variant(label);
  return { family: charmFamilies[fi], variant: variants[vi], familyIndex: fi, variantIndex: vi, rank };
};

function runContext(state: Record<string, unknown>) {
  const context: any = { state, audio: { enabled: true }, toast: vi.fn() };
  Object.assign(context, createRunState(context));
  return context;
}

describe("hand levels", () => {
  it("grows petals by a fixed amount per level", () => {
    const pair = handsData.find(h => h.id === "pair")!;
    expect(levelPetals(pair)).toBe(6);
  });
});

describe("charm effects", () => {
  it("adds up petals, sparkle and rerolls", () => {
    expect(charmTotals([charm("Daisy Charm", "Mint", 2), charm("Daisy Charm", "Rose"), charm("Swan Charm", "Golden")]))
      .toEqual({ petals: 16, mult: 1, rerolls: 1 });
  });

  it("includes banked reroll bonuses in the hand preview", () => {
    const ctx = runContext({ dice: [2, 2, 3, 4, 6], handLevels: { pair: 1 }, charms: [], rerollsUsed: 0, rerollsLeft: 3, handsLeft: 3, bonus: { petals: 10, mult: 2 } });
    const preview = ctx.previewStats();
    expect(preview.petals).toBe(17 + 5 + 10);
    expect(preview.mult).toBe(2 + 2);
    expect(preview.total).toBe(32 * 4);
  });

  it("banks petals from reroll charms and refunds a reroll only once per hand", () => {
    const acorn = charm("Acorn Charm", "Golden"), frog = charm("Frog Charm", "Mint");
    const state: any = { charms: [acorn, frog], rerollsLeft: 1, bonus: emptyBonus(), refunded: [] };
    const ctx = runContext(state);
    const { applyRerollCharmEffects } = createRerollCharmEffects(ctx);

    applyRerollCharmEffects([acorn, frog]);
    applyRerollCharmEffects([acorn]);

    expect(state.rerollsLeft).toBe(2);
    expect(state.bonus).toEqual({ petals: 12, mult: 0 });
  });
});

describe("save repair", () => {
  it("rejects empty saves and repairs broken fields", () => {
    expect(normalizeSave(null)).toBeNull();
    const repaired = normalizeSave({ level: 3, dice: [9, 1], handLevels: { pair: 2 }, charms: [{ familyIndex: 999, variantIndex: 0 }, { familyIndex: 0, variantIndex: 1, rank: 2 }], phase: "bogus" })!;
    expect(repaired.dice).toHaveLength(5);
    expect(repaired.dice.every((n: number) => n >= 1 && n <= 6)).toBe(true);
    expect(repaired.handLevels).toMatchObject({ high: 1, pair: 2 });
    expect(repaired.charms).toHaveLength(1);
    expect(repaired.charms[0].rank).toBe(2);
    expect(repaired.phase).toBe("play");
    expect(repaired.bonus).toEqual({ petals: 0, mult: 0 });
  });
});
