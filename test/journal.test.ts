import { describe, expect, it } from "vitest";
import { emptyJournal, recordJournalEvent, STICKERS } from "../src/journal";

describe("Luma's journal", () => {
  it("counts lifetime stats and unlocks matching stickers once", () => {
    const journal = emptyJournal();
    const first = recordJournalEvent(journal, { type: "play", hand: "full", handName: "Full House", score: 1200 }, 1);
    expect(first.map(s => s.id).sort()).toEqual(["bigBloom", "picnic"]);
    expect(journal.stats).toMatchObject({ handsPlayed: 1, bestHand: 1200, bestHandName: "Full House", totalStarlight: 1200 });

    const again = recordJournalEvent(journal, { type: "play", hand: "full", handName: "Full House", score: 900 }, 2);
    expect(again).toEqual([]);
    expect(journal.stats.bestHand).toBe(1200);
  });

  it("unlocks counter-based stickers when the count is reached", () => {
    const journal = emptyJournal();
    for (let i = 0; i < 9; i++) expect(recordJournalEvent(journal, { type: "pet" })).toEqual([]);
    expect(recordJournalEvent(journal, { type: "pet" }).map(s => s.id)).toEqual(["bunnyFriend"]);
  });

  it("has unique sticker ids", () => {
    expect(new Set(STICKERS.map(s => s.id)).size).toBe(STICKERS.length);
  });
});
