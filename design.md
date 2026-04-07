# Design: Candy Crush Special Candy Combos

## Goal
Build a deterministic, unattended-safe match-3 implementation inspired by Candy Crush Saga with one explicit twist: special candy combos from 4+ clears.

## Loop
1. Player swaps adjacent candies.
2. Invalid non-matching swaps revert.
3. Matches clear, cascades resolve, board refills deterministically.
4. Special striped candies spawn on 4+ clears and detonate row+column when cleared.
5. Score/combo update and timer advances until game over.

## Determinism
- Seeded LCG RNG drives initial board and refills.
- Board initialization avoids immediate pre-run matches.
- `window.advanceTime(ms)` and `window.render_game_to_text()` expose deterministic inspection hooks.

## Controls
- Click/click swap for primary input.
- `Enter` start, `P` pause/resume, `R` restart, `Shift+R` hard reset.
