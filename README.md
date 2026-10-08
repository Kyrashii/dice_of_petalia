# Dice of Petalia

Vite + TypeScript source for the original standalone Dice of Petalia game.

## Commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm test:run
corepack pnpm build
```

`src/main.ts` coordinates the game flow and screens. The dice-hand and scoring rules live in `src/game-rules.ts`, charm scoring in `src/run-state.ts`, and save validation in `src/run-save.ts`; all are covered by Vitest.

Every move commits its result (state and save) before its animation plays, so counters update instantly and closing the tab mid-roll never loses or repeats a move. All `localStorage` access goes through `src/storage.ts` so blocked storage never stops the game.

Keyboard: `1`–`5` pick dice, `R` reroll, `P` play, `Esc` clear the selection or close a menu.

## Vercel

Import this repository as a Vite project. Vercel's defaults are sufficient: build command `pnpm build` and output directory `dist`.
