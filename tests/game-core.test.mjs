import assert from "node:assert/strict";
import {
  advanceTime,
  constants,
  createGameState,
  forceStart,
  renderStateToText,
  runDeterministicVerification,
  selectTile,
  togglePause,
} from "../src/game-core.js";

const state = createGameState();
forceStart(state);

const verification = runDeterministicVerification();
assert.equal(verification.score > 0, true, "verification run should score points");
assert.equal(verification.moves > 0, true, "verification run should consume moves");

let madeMatch = false;
for (let r = 0; r < constants.ROWS && !madeMatch; r += 1) {
  for (let c = 0; c < constants.COLS - 1 && !madeMatch; c += 1) {
    selectTile(state, r, c);
    const changed = selectTile(state, r, c + 1);
    if (changed && state.lastClearCount > 0) {
      madeMatch = true;
    }
  }
}
assert.equal(madeMatch, true, "should find at least one valid swap");

const beforePause = state.elapsedMs;
togglePause(state);
advanceTime(state, 5_000);
assert.equal(state.elapsedMs, beforePause, "paused state should not advance time");

togglePause(state);
advanceTime(state, 5_000);
assert.equal(state.elapsedMs > beforePause, true, "running state should advance time");

const text = JSON.parse(renderStateToText(state));
assert.equal(Array.isArray(text.rows), true, "render rows should be present");
assert.equal(text.rows.length, constants.ROWS, "render rows should match board size");

console.log("game-core tests passed");
