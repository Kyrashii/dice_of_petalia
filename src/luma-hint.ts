import { evaluate } from "./game-rules";

export interface Hint {
  /** Dice indices Luma suggests rerolling (empty means "play it"). */
  reroll: number[];
  /** What Luma says about the suggestion. */
  message: string;
}

const STRAIGHTS = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];

/** Indices of dice to keep for the longest four-long straight draw, if any. */
function straightDraw(dice: readonly number[]): number[] | null {
  for (const run of STRAIGHTS) {
    const keep: number[] = [];
    run.forEach((value) => {
      const index = dice.findIndex((die, i) => die === value && !keep.includes(i));
      if (index >= 0) keep.push(index);
    });
    if (keep.length === 4) return keep;
  }
  return null;
}

/**
 * A friendly rule-of-thumb suggestion for which dice to reroll.
 * It never suggests rerolling dice that would break the current hand type.
 */
export function suggestReroll(dice: readonly number[], rerollsLeft: number, clearsRound = false): Hint {
  const hand = evaluate(dice);
  const all = dice.map((_, index) => index);
  const countOf = (value: number) => dice.filter((die) => die === value).length;
  const others = (keep: (value: number) => boolean) => all.filter((index) => !keep(dice[index]));

  if (clearsRound) return { reroll: [], message: "This hand already clears the round. Play it!" };
  if (rerollsLeft < 1) return { reroll: [], message: "No rerolls left, so this is the hand to play." };

  switch (hand.id) {
    case "five":
    case "straight":
    case "full":
      return { reroll: [], message: `A ${hand.name}! Keep every die and play it.` };
    case "four":
      return { reroll: others((value) => countOf(value) === 4), message: "Reroll the odd one out. You keep your Four of a Kind and might find Five!" };
    case "three":
      return { reroll: others((value) => countOf(value) === 3), message: "Keep your trio and reroll the other two. A Full House or Four could bloom." };
    case "twoPair":
      return { reroll: others((value) => countOf(value) === 2), message: "Keep both pairs and reroll the single die: one in three makes a Full House." };
    default: {
      const draw = straightDraw(dice);
      if (draw) return { reroll: all.filter((index) => !draw.includes(index)), message: "Four in a row! Reroll the extra die to chase a Straight." };
      if (hand.id === "pair") return { reroll: others((value) => countOf(value) === 2), message: "Keep your pair and reroll the rest to grow it." };
      const high = Math.max(...dice);
      const keep = dice.indexOf(high);
      return { reroll: all.filter((index) => index !== keep), message: `Nothing matches yet. Keep your ${high} and reroll the others.` };
    }
  }
}
