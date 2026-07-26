export type HandId =
  | "high"
  | "pair"
  | "twoPair"
  | "three"
  | "straight"
  | "full"
  | "four"
  | "five";

export interface Hand {
  id: HandId;
  name: string;
  base: number;
  mult: number;
  desc: string;
}

export const handsData: readonly Hand[] = [
  { id: "high", name: "High Roll", base: 0, mult: 1, desc: "All five dice add petals" },
  { id: "pair", name: "Pair", base: 5, mult: 2, desc: "Two dice share a number" },
  { id: "twoPair", name: "Two Pair", base: 12, mult: 3, desc: "Two different pairs" },
  { id: "three", name: "Three of a Kind", base: 18, mult: 4, desc: "Three matching dice" },
  { id: "straight", name: "Straight", base: 28, mult: 6, desc: "Five numbers in sequence" },
  { id: "full", name: "Full House", base: 35, mult: 7, desc: "A pair and a trio" },
  { id: "four", name: "Four of a Kind", base: 45, mult: 9, desc: "Four matching dice" },
  { id: "five", name: "Five of a Kind", base: 70, mult: 13, desc: "All five dice match" }
];

export function targetFor(level: number): number {
  return Math.round((72 + level * 28 + Math.pow(level, 1.72) * 7) / 10) * 10;
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function rollFive(random = Math.random): number[] {
  return Array.from({ length: 5 }, () => 1 + Math.floor(random() * 6));
}

export function counts(dice: readonly number[]): number[] {
  const countByValue: Record<number, number> = {};
  dice.forEach((value) => (countByValue[value] = (countByValue[value] ?? 0) + 1));
  return Object.values(countByValue).sort((a, b) => b - a);
}

export function evaluate(dice: readonly number[]): Hand {
  const grouped = counts(dice);
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  let id: HandId = "high";

  if (grouped[0] === 5) id = "five";
  else if (grouped[0] === 4) id = "four";
  else if (grouped[0] === 3 && grouped[1] === 2) id = "full";
  else if (unique.length === 5 && unique[4] - unique[0] === 4) id = "straight";
  else if (grouped[0] === 3) id = "three";
  else if (grouped[0] === 2 && grouped[1] === 2) id = "twoPair";
  else if (grouped[0] === 2) id = "pair";

  return handsData.find((hand) => hand.id === id)!;
}
