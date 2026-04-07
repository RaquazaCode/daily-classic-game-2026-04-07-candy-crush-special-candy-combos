import {
  advanceTime,
  constants,
  createGameState,
  forceStart,
  getTimeRemainingMs,
  renderStateToText,
  resetGame,
  runDeterministicVerification,
  selectTile,
  togglePause,
} from "./game-core.js";

const state = createGameState();

const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status-line");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const movesEl = document.querySelector("#moves");
const timeEl = document.querySelector("#time");
const restartButton = document.querySelector("#restart-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");

let rafId = 0;
let lastTick = performance.now();

function handleTileClick(row, col) {
  if (state.mode === "idle") forceStart(state);
  selectTile(state, row, col);
  render();
}

function tileLabel(cell, row, col) {
  const map = {
    R: "Red",
    G: "Green",
    B: "Blue",
    Y: "Yellow",
    P: "Purple",
    O: "Orange",
  };
  const special = cell.special === "striped" ? " striped" : "";
  return `${map[cell.color]}${special} candy row ${row + 1} col ${col + 1}`;
}

function render() {
  boardEl.textContent = "";
  for (let r = 0; r < constants.ROWS; r += 1) {
    for (let c = 0; c < constants.COLS; c += 1) {
      const cell = state.board[r][c];
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile tile-${cell.color.toLowerCase()}`;
      button.dataset.row = String(r);
      button.dataset.col = String(c);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", tileLabel(cell, r, c));
      if (cell.special === "striped") button.classList.add("tile-striped");
      if (state.selected && state.selected.row === r && state.selected.col === c) {
        button.classList.add("tile-selected");
      }
      button.addEventListener("click", () => handleTileClick(r, c));
      boardEl.appendChild(button);
    }
  }

  statusEl.textContent = state.message;
  scoreEl.textContent = `Score: ${state.score}`;
  comboEl.textContent = `Combo: x${state.combo}`;
  movesEl.textContent = `Moves: ${state.moves}`;
  timeEl.textContent = `Time: ${(getTimeRemainingMs(state) / 1000).toFixed(1)}s`;
}

function tick(now) {
  const delta = now - lastTick;
  lastTick = now;
  advanceTime(state, delta);
  render();
  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  cancelAnimationFrame(rafId);
  lastTick = performance.now();
  rafId = requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    forceStart(state);
    render();
    return;
  }
  if (event.key.toLowerCase() === "p") {
    togglePause(state);
    render();
    return;
  }
  if (event.shiftKey && event.key.toLowerCase() === "r") {
    resetGame(state);
    render();
    return;
  }
  if (event.key.toLowerCase() === "r") {
    resetGame(state);
    forceStart(state);
    render();
  }
});

restartButton.addEventListener("click", () => {
  resetGame(state);
  forceStart(state);
  render();
});
pauseButton.addEventListener("click", () => {
  togglePause(state);
  render();
});
resetButton.addEventListener("click", () => {
  resetGame(state);
  render();
});

window.advanceTime = (ms) => {
  advanceTime(state, ms);
  render();
};
window.render_game_to_text = () => renderStateToText(state);
window.__runDeterministicVerification = () => runDeterministicVerification();

render();
startLoop();
