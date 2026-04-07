export const constants = {
  ROWS: 8,
  COLS: 8,
  COLORS: ["R", "G", "B", "Y", "P", "O"],
  ROUND_TIME_MS: 120_000,
  SCORE_PER_TILE: 10,
  SPECIAL_CLEAR_BONUS: 8,
  MATCH_MIN: 3,
  RNG_SEED: 20260407,
};

function makeRng(seed = constants.RNG_SEED) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function cloneCell(cell) {
  return { color: cell.color, special: cell.special ?? null };
}

function createCell(color, special = null) {
  return { color, special };
}

function makeEmptyBoard() {
  return Array.from({ length: constants.ROWS }, () => Array.from({ length: constants.COLS }, () => createCell("R")));
}

function randomColor(rng) {
  return constants.COLORS[Math.floor(rng() * constants.COLORS.length)];
}

function wouldCreateMatch(board, row, col, color) {
  if (col >= 2 && board[row][col - 1].color === color && board[row][col - 2].color === color) return true;
  if (row >= 2 && board[row - 1][col].color === color && board[row - 2][col].color === color) return true;
  return false;
}

function buildBoard(rng) {
  const board = makeEmptyBoard();
  for (let r = 0; r < constants.ROWS; r += 1) {
    for (let c = 0; c < constants.COLS; c += 1) {
      let color = randomColor(rng);
      while (wouldCreateMatch(board, r, c, color)) {
        color = randomColor(rng);
      }
      board[r][c] = createCell(color);
    }
  }
  return board;
}

function swapCells(board, a, b) {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function keyFor(row, col) {
  return `${row}:${col}`;
}

function findMatches(board) {
  const groups = [];

  for (let r = 0; r < constants.ROWS; r += 1) {
    let runStart = 0;
    for (let c = 1; c <= constants.COLS; c += 1) {
      const ended = c === constants.COLS || board[r][c].color !== board[r][runStart].color;
      if (ended) {
        const length = c - runStart;
        if (length >= constants.MATCH_MIN) {
          const cells = [];
          for (let cc = runStart; cc < c; cc += 1) cells.push({ row: r, col: cc });
          groups.push({ cells, axis: "row" });
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < constants.COLS; c += 1) {
    let runStart = 0;
    for (let r = 1; r <= constants.ROWS; r += 1) {
      const ended = r === constants.ROWS || board[r][c].color !== board[runStart][c].color;
      if (ended) {
        const length = r - runStart;
        if (length >= constants.MATCH_MIN) {
          const cells = [];
          for (let rr = runStart; rr < r; rr += 1) cells.push({ row: rr, col: c });
          groups.push({ cells, axis: "col" });
        }
        runStart = r;
      }
    }
  }

  return groups;
}

function collapseAndRefill(board, rng) {
  for (let c = 0; c < constants.COLS; c += 1) {
    const kept = [];
    for (let r = constants.ROWS - 1; r >= 0; r -= 1) {
      if (board[r][c]) kept.push(board[r][c]);
    }
    let writeRow = constants.ROWS - 1;
    for (const cell of kept) {
      board[writeRow][c] = cell;
      writeRow -= 1;
    }
    while (writeRow >= 0) {
      board[writeRow][c] = createCell(randomColor(rng));
      writeRow -= 1;
    }
  }
}

function triggerSpecialClear(board, specialCell) {
  const clearSet = new Set();
  const { row, col } = specialCell;
  for (let r = 0; r < constants.ROWS; r += 1) clearSet.add(keyFor(r, col));
  for (let c = 0; c < constants.COLS; c += 1) clearSet.add(keyFor(row, c));
  return clearSet;
}

function resolveBoard(state) {
  let cascade = 0;

  while (true) {
    const groups = findMatches(state.board);
    if (groups.length === 0) break;

    cascade += 1;
    const clearKeys = new Set();
    const specialPlacements = [];

    for (const group of groups) {
      for (const pos of group.cells) clearKeys.add(keyFor(pos.row, pos.col));
      if (group.cells.length >= 4) {
        const anchor = group.cells[Math.floor(group.cells.length / 2)];
        specialPlacements.push(anchor);
      }
    }

    const specialsToTrigger = [];
    for (const key of clearKeys) {
      const [rowText, colText] = key.split(":");
      const row = Number(rowText);
      const col = Number(colText);
      const cell = state.board[row][col];
      if (cell?.special === "striped") {
        specialsToTrigger.push({ row, col });
      }
    }

    for (const special of specialsToTrigger) {
      for (const extra of triggerSpecialClear(state.board, special)) clearKeys.add(extra);
      state.score += constants.SPECIAL_CLEAR_BONUS * cascade;
    }

    for (const key of clearKeys) {
      const [rowText, colText] = key.split(":");
      const row = Number(rowText);
      const col = Number(colText);
      state.board[row][col] = null;
    }

    collapseAndRefill(state.board, state.rng);

    for (const anchor of specialPlacements) {
      if (state.board[anchor.row][anchor.col]) {
        state.board[anchor.row][anchor.col].special = "striped";
      }
    }

    state.score += clearKeys.size * constants.SCORE_PER_TILE * cascade;
    state.combo = Math.max(state.combo, cascade + 1);
    state.lastClearCount = clearKeys.size;
  }

  if (cascade === 0) {
    state.combo = 1;
    state.lastClearCount = 0;
  }
}

export function createGameState() {
  const rng = makeRng();
  return {
    rng,
    board: buildBoard(rng),
    mode: "idle",
    score: 0,
    combo: 1,
    moves: 0,
    elapsedMs: 0,
    selected: null,
    lastSwap: null,
    lastClearCount: 0,
    message: "Press Enter to start.",
  };
}

export function resetGame(state) {
  const fresh = createGameState();
  Object.assign(state, fresh);
}

export function forceStart(state) {
  if (state.mode === "idle") {
    state.mode = "running";
    state.message = "Swap adjacent candies to match 3 or more.";
  }
}

export function togglePause(state) {
  if (state.mode === "running") {
    state.mode = "paused";
    state.message = "Paused.";
    return;
  }
  if (state.mode === "paused") {
    state.mode = "running";
    state.message = "Back in play.";
  }
}

export function selectTile(state, row, col) {
  if (state.mode !== "running") return false;
  if (state.selected && state.selected.row === row && state.selected.col === col) {
    state.selected = null;
    return true;
  }

  const next = { row, col };
  if (!state.selected) {
    state.selected = next;
    return true;
  }

  if (!isAdjacent(state.selected, next)) {
    state.selected = next;
    return true;
  }

  const first = state.selected;
  swapCells(state.board, first, next);
  const hasMatch = findMatches(state.board).length > 0;

  if (!hasMatch) {
    swapCells(state.board, first, next);
    state.combo = 1;
    state.lastClearCount = 0;
    state.message = "No match from that swap.";
    state.selected = null;
    return false;
  }

  state.moves += 1;
  state.lastSwap = { from: first, to: next };
  resolveBoard(state);
  state.selected = null;
  state.message = `Matched ${state.lastClearCount} candies.`;
  return true;
}

export function advanceTime(state, ms) {
  if (state.mode !== "running") return;
  state.elapsedMs += ms;
  if (state.elapsedMs >= constants.ROUND_TIME_MS) {
    state.elapsedMs = constants.ROUND_TIME_MS;
    state.mode = "game_over";
    state.message = "Time up. Press R to restart.";
  }
}

export function getTimeRemainingMs(state) {
  return Math.max(0, constants.ROUND_TIME_MS - state.elapsedMs);
}

export function renderStateToText(state) {
  const rows = state.board.map((row) => row.map((cell) => `${cell.color}${cell.special === "striped" ? "*" : ""}`).join(" "));
  return JSON.stringify(
    {
      mode: state.mode,
      score: state.score,
      combo: state.combo,
      moves: state.moves,
      timeRemainingMs: getTimeRemainingMs(state),
      message: state.message,
      rows,
      selected: state.selected,
      lastClearCount: state.lastClearCount,
    },
    null,
    2,
  );
}

export function runDeterministicVerification() {
  const state = createGameState();
  forceStart(state);

  for (let r = 0; r < constants.ROWS; r += 1) {
    for (let c = 0; c < constants.COLS - 1; c += 1) {
      selectTile(state, r, c);
      const changed = selectTile(state, r, c + 1);
      if (changed && state.lastClearCount > 0) {
        advanceTime(state, 1000);
        return {
          score: state.score,
          moves: state.moves,
          combo: state.combo,
          render: JSON.parse(renderStateToText(state)),
        };
      }
    }
  }

  advanceTime(state, 1000);
  return {
    score: state.score,
    moves: state.moves,
    combo: state.combo,
    render: JSON.parse(renderStateToText(state)),
  };
}
