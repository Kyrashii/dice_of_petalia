// @ts-nocheck
import { storage } from "./storage";

export const JOURNAL_KEY = "dice-of-petalia-journal-v1";

// Stickers Luma collects in her journal. `check` sees one game event and the
// lifetime stats after that event has been counted.
export const STICKERS = [
  { id: "firstBloom", glyph: "🌱", title: "First Bloom", desc: "Clear your first round", check: e => e.type === "round-win" },
  { id: "staircase", glyph: "🪜", title: "Staircase of Stars", desc: "Play a Straight", check: e => e.type === "play" && e.hand === "straight" },
  { id: "picnic", glyph: "🧺", title: "Garden Picnic", desc: "Play a Full House", check: e => e.type === "play" && e.hand === "full" },
  { id: "quartet", glyph: "🎻", title: "Moonlit Quartet", desc: "Play Four of a Kind", check: e => e.type === "play" && e.hand === "four" },
  { id: "moonBlink", glyph: "🌕", title: "The Moon Blinked", desc: "Play Five of a Kind", check: e => e.type === "play" && e.hand === "five" },
  { id: "bigBloom", glyph: "🌸", title: "Big Bloom", desc: "Score 1,000 with one hand", check: e => e.type === "play" && e.score >= 1000 },
  { id: "starHoard", glyph: "✨", title: "Starlight Hoard", desc: "Score 10,000 with one hand", check: e => e.type === "play" && e.score >= 10000 },
  { id: "thrifty", glyph: "🍃", title: "Thrifty Wanderer", desc: "Clear a round without rerolling", check: e => e.type === "round-win" && e.rerollsUsedThisRound === 0 },
  { id: "oneHand", glyph: "🎯", title: "One Hand Wonder", desc: "Clear a round with your first hand", check: e => e.type === "round-win" && e.handsUsed === 1 },
  { id: "lastPetal", glyph: "🥀", title: "Last Petal", desc: "Clear a round on your final hand", check: e => e.type === "round-win" && e.handsUsed === 3 },
  { id: "collector", glyph: "🎀", title: "Charm Collector", desc: "Hold 6 charms in one journey", check: e => e.type === "charm" && e.charms >= 6 },
  { id: "golden", glyph: "👑", title: "Golden Touch", desc: "Grow a hand to level 5", check: e => e.type === "upgrade" && e.level >= 5 },
  { id: "halfway", glyph: "🌗", title: "Halfway Garden", desc: "Reach round 13", check: e => e.type === "round-win" && e.round >= 12 },
  { id: "gatekeeper", glyph: "🌙", title: "Starlight Gate", desc: "Clear all 25 rounds", check: e => e.type === "run-end" && e.won },
  { id: "bunnyFriend", glyph: "🐰", title: "Bunny Friend", desc: "Pet Lady Luma 10 times", check: (e, stats) => e.type === "pet" && stats.pets >= 10 },
  { id: "persistent", glyph: "🌈", title: "Never Give Up", desc: "Begin 5 journeys", check: (e, stats) => e.type === "run-start" && stats.journeys >= 5 }
];

export function emptyJournal() {
  return { stickers: {}, stats: { journeys: 0, handsPlayed: 0, rerolls: 0, roundsCleared: 0, bestHand: 0, bestHandName: "", totalStarlight: 0, pets: 0, fiveKinds: 0 } };
}

export function loadJournal() {
  const saved = storage.getJSON(JOURNAL_KEY, null), fresh = emptyJournal();
  if (!saved || typeof saved !== "object") return fresh;
  return { stickers: { ...(saved.stickers || {}) }, stats: { ...fresh.stats, ...(saved.stats || {}) } };
}

// Folds one event into the stats and returns the stickers it newly unlocks.
export function recordJournalEvent(journal, event, now = Date.now()) {
  const stats = journal.stats;
  if (event.type === "play") {
    stats.handsPlayed++; stats.totalStarlight += event.score;
    if (event.score > stats.bestHand) { stats.bestHand = event.score; stats.bestHandName = event.handName || ""; }
    if (event.hand === "five") stats.fiveKinds++;
  }
  if (event.type === "reroll") stats.rerolls++;
  if (event.type === "round-win") stats.roundsCleared++;
  if (event.type === "pet") stats.pets++;
  if (event.type === "run-start") stats.journeys++;
  const unlocked = STICKERS.filter(sticker => !journal.stickers[sticker.id] && sticker.check(event, stats));
  unlocked.forEach(sticker => { journal.stickers[sticker.id] = now; });
  return unlocked;
}

export function createJournal(context) {
  let journal = loadJournal();
  function record(event) {
    const unlocked = recordJournalEvent(journal, event);
    storage.setJSON(JOURNAL_KEY, journal);
    unlocked.forEach((sticker, index) => setTimeout(() => context.celebrateSticker?.(sticker), 900 + index * 1600));
    return unlocked;
  }
  return { record, get journal() { return journal; } };
}
