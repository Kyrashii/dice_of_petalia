# Dice of Petalia

Vite + TypeScript source for the original standalone Dice of Petalia game.

## Commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm test:run
corepack pnpm build
```

`src/main.ts` retains the existing game flow, DOM behavior, persistence keys, sound, and inline sprite asset. The reusable dice-hand and scoring rules live in `src/game-rules.ts` and are covered by Vitest.

## Vercel

Import this repository as a Vite project. Vercel's defaults are sufficient: build command `pnpm build` and output directory `dist`.
