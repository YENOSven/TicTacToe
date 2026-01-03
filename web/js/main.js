(function() {
  const HUMAN = "B";
  const COMPUTER = "R";
  const EMPTY = "E";
  const MIN_DELAY_MS = 300;

  const sizeInput = document.getElementById("size");
  const emptyInput = document.getElementById("empties");
  const depthInput = document.getElementById("depth");
  const resetButton = document.getElementById("reset");
  const statusEl = document.getElementById("status");
  const phaseEl = document.getElementById("phase");
  const boardEl = document.getElementById("board");

  const state = {
    board: [],
    boardSize: 3,
    emptySlots: 1,
    maxDepth: 4,
    selection: null,
    gameOver: false,
    layouts: new Map(),
    buttons: []
  };

  resetButton.addEventListener("click", function(e) {
    e.preventDefault();
    startNewGame();
  });

  document.getElementById("config").addEventListener("submit", function(e) {
    e.preventDefault();
    startNewGame();
  });

  function startNewGame() {
    state.boardSize = clampInt(sizeInput.value, 3, 5, 3);
    state.emptySlots = clampInt(emptyInput.value, 0, state.boardSize * state.boardSize - 1, 1);
    state.maxDepth = clampInt(depthInput.value, 1, 7, 4);
    sizeInput.value = state.boardSize;
    emptyInput.value = state.emptySlots;
    depthInput.value = state.maxDepth;

    state.board = Array.from({ length: state.boardSize }, () =>
      Array(state.boardSize).fill(EMPTY)
    );
    state.layouts = new Map();
    state.selection = null;
    state.gameOver = false;

    buildBoard();
    updatePhaseLabel();
    setStatus("Your turn: place a tile.");
  }

  function buildBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${state.boardSize}, var(--cell-size))`;
    boardEl.innerHTML = "";
    state.buttons = [];
    for (let r = 0; r < state.boardSize; r++) {
      const rowButtons = [];
      for (let c = 0; c < state.boardSize; c++) {
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener("click", onCellClick);
        boardEl.appendChild(cell);
        rowButtons.push(cell);
      }
      state.buttons.push(rowButtons);
    }
    paintBoard();
  }

  function onCellClick(event) {
    if (state.gameOver || boardEl.classList.contains("thinking")) return;
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const emptyCount = countEmpty();

    if (emptyCount > state.emptySlots) {
      if (!positionIsEmpty(row, col)) {
        setStatus("Pick an empty square.");
        return;
      }
      state.board[row][col] = HUMAN;
      state.selection = null;
      paintBoard();
      if (checkForEnd(HUMAN)) return;
      runComputerTurn();
    } else {
      if (!state.selection) {
        if (!isHumanTile(row, col)) {
          setStatus("Select one of your tiles to move.");
          return;
        }
        state.selection = { row, col };
        paintBoard();
        setStatus("Now click an adjacent empty square.");
        return;
      }
      const from = state.selection;
      if (!positionIsEmpty(row, col) || !adjacent(from.row, from.col, row, col)) {
        state.selection = null;
        paintBoard();
        setStatus("Moves must go to an adjacent empty square.");
        return;
      }
      state.board[from.row][from.col] = EMPTY;
      state.board[row][col] = HUMAN;
      state.selection = null;
      paintBoard();
      if (checkForEnd(HUMAN)) return;
      runComputerTurn();
    }
  }

  function runComputerTurn() {
    boardEl.classList.add("thinking");
    setStatus("Computer thinking...");
    setTimeout(() => {
      state.layouts = new Map();
      const reply = computerPlay(COMPUTER, -1, 4, 0, state.layouts);
      if (countEmpty() > state.emptySlots) {
        state.board[reply.row][reply.col] = COMPUTER;
      } else if (reply.emptyTarget) {
        state.board[reply.row][reply.col] = EMPTY;
        state.board[reply.emptyTarget.row][reply.emptyTarget.col] = COMPUTER;
      }
      paintBoard();
      checkForEnd(COMPUTER);
      boardEl.classList.remove("thinking");
    }, MIN_DELAY_MS);
  }

  function computerPlay(symbol, highestScore, lowestScore, level, layouts) {
    const opponent = symbol === COMPUTER ? HUMAN : COMPUTER;
    let value = symbol === COMPUTER ? -1 : 4;
    let bestRow = -1;
    let bestCol = -1;
    let bestEmptyTarget = null;

    if (countEmpty() > state.emptySlots) {
      for (let r = 0; r < state.boardSize; r++) {
        for (let c = 0; c < state.boardSize; c++) {
          if (positionIsEmpty(r, c)) {
            state.board[r][c] = symbol;
            const key = boardKey();
            let reply;
            if (winner(symbol) || isDraw(opponent, state.emptySlots) || level >= state.maxDepth) {
              reply = { score: evaluate(symbol, state.emptySlots), row: r, col: c };
            } else {
              const cached = layouts.get(key);
              if (cached !== undefined) {
                reply = { score: cached, row: r, col: c };
              } else {
                reply = computerPlay(opponent, highestScore, lowestScore, level + 1, layouts);
                if (!layouts.has(key)) layouts.set(key, reply.score);
              }
            }
            state.board[r][c] = EMPTY;

            if ((symbol === COMPUTER && reply.score > value) ||
                (symbol === HUMAN && reply.score < value)) {
              bestRow = r;
              bestCol = c;
              value = reply.score;
              if (symbol === COMPUTER && value > highestScore) highestScore = value;
              else if (symbol === HUMAN && value < lowestScore) lowestScore = value;
              if (highestScore >= lowestScore) {
                return { score: value, row: bestRow, col: bestCol, emptyTarget: bestEmptyTarget };
              }
            }
          }
        }
      }
    } else {
      for (let er = 0; er < state.boardSize; er++) {
        for (let ec = 0; ec < state.boardSize; ec++) {
          if (positionIsEmpty(er, ec)) {
            const reply = findBestShift(er, ec, highestScore, lowestScore, symbol, opponent, value, level, layouts);
            if ((symbol === COMPUTER && reply.score > value) ||
                (symbol === HUMAN && reply.score < value)) {
              bestRow = reply.row;
              bestCol = reply.col;
              value = reply.score;
              bestEmptyTarget = { row: er, col: ec };
              if (symbol === COMPUTER && value > highestScore) highestScore = value;
              else if (symbol === HUMAN && value < lowestScore) lowestScore = value;
              if (highestScore >= lowestScore) {
                return { score: value, row: bestRow, col: bestCol, emptyTarget: bestEmptyTarget };
              }
            }
          }
        }
      }
    }
    return { score: value, row: bestRow, col: bestCol, emptyTarget: bestEmptyTarget };
  }

  function findBestShift(emptyRow, emptyCol, highestScore, lowestScore, symbol, opponent, value, level, layouts) {
    let bestRow = -1;
    let bestCol = -1;
    let bestVal = value;

    const rowStart = Math.max(0, emptyRow - 1);
    const rowEnd = Math.min(state.boardSize - 1, emptyRow + 1);
    const colStart = Math.max(0, emptyCol - 1);
    const colEnd = Math.min(state.boardSize - 1, emptyCol + 1);

    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        if ((symbol === COMPUTER && isComputerTile(r, c)) ||
            (symbol === HUMAN && isHumanTile(r, c))) {
          state.board[r][c] = EMPTY;
          state.board[emptyRow][emptyCol] = symbol;
          const key = boardKey();
          let reply;
          if (winner(symbol) || isDraw(opponent, state.emptySlots) || level >= state.maxDepth) {
            reply = { score: evaluate(symbol, state.emptySlots), row: r, col: c };
          } else {
            const cached = layouts.get(key);
            if (cached !== undefined) {
              reply = { score: cached, row: r, col: c };
            } else {
              reply = computerPlay(opponent, highestScore, lowestScore, level + 1, layouts);
              if (!layouts.has(key)) layouts.set(key, reply.score);
            }
          }
          state.board[r][c] = symbol;
          state.board[emptyRow][emptyCol] = EMPTY;

          if ((symbol === COMPUTER && reply.score > bestVal) ||
              (symbol === HUMAN && reply.score < bestVal)) {
            bestVal = reply.score;
            bestRow = r;
            bestCol = c;
            if (symbol === COMPUTER && bestVal > highestScore) highestScore = bestVal;
            else if (symbol === HUMAN && bestVal < lowestScore) lowestScore = bestVal;
            if (highestScore >= lowestScore) {
              return { score: bestVal, row: bestRow, col: bestCol };
            }
          }
        }
      }
    }
    return { score: bestVal, row: bestRow, col: bestCol };
  }

  function checkForEnd(playerJustMoved) {
    if (winner(playerJustMoved)) {
      endGame(playerJustMoved === HUMAN ? "You win." : "Computer wins.");
      return true;
    }
    if (isDraw(opponentOf(playerJustMoved), state.emptySlots)) {
      endGame("Draw: no legal moves remain.");
      return true;
    }
    updatePhaseLabel();
    setStatus(playerJustMoved === HUMAN ? "Computer turn..." : "Your turn.");
    return false;
  }

  function endGame(message) {
    state.gameOver = true;
    setStatus(message + " Click Start / Restart to play again.");
    boardEl.classList.remove("thinking");
  }

  function paintBoard() {
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        const btn = state.buttons[r][c];
        const symbol = state.board[r][c];
        const marked = state.selection && state.selection.row === r && state.selection.col === c;
        btn.style.backgroundImage = spriteFor(symbol, marked);
      }
    }
  }

  function spriteFor(symbol, marked) {
    if (marked) return "url('assets/marked.gif')";
    if (symbol === HUMAN) return "url('assets/human.gif')";
    if (symbol === COMPUTER) return "url('assets/computer.gif')";
    return "url('assets/empty.gif')";
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function updatePhaseLabel() {
    phaseEl.textContent = countEmpty() > state.emptySlots ? "Phase: place tiles" : "Phase: slide tiles";
  }

  function positionIsEmpty(row, col) { return state.board[row][col] === EMPTY; }
  function isComputerTile(row, col) { return state.board[row][col] === COMPUTER; }
  function isHumanTile(row, col) { return state.board[row][col] === HUMAN; }

  function countEmpty() {
    let count = 0;
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        if (state.board[r][c] === EMPTY) count++;
      }
    }
    return count;
  }

  function adjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  }

  function winner(symbol) {
    for (let r = 0; r < state.boardSize; r++) {
      let rowWin = true;
      for (let c = 0; c < state.boardSize; c++) {
        if (state.board[r][c] !== symbol) { rowWin = false; break; }
      }
      if (rowWin) return true;
    }
    for (let c = 0; c < state.boardSize; c++) {
      let colWin = true;
      for (let r = 0; r < state.boardSize; r++) {
        if (state.board[r][c] !== symbol) { colWin = false; break; }
      }
      if (colWin) return true;
    }
    let diag = true;
    for (let i = 0; i < state.boardSize; i++) {
      if (state.board[i][i] !== symbol) { diag = false; break; }
    }
    if (diag) return true;
    let anti = true;
    for (let i = 0; i < state.boardSize; i++) {
      if (state.board[i][state.boardSize - 1 - i] !== symbol) { anti = false; break; }
    }
    return anti;
  }

  function hasAdjacentSymbol(r, c, symbol) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < state.boardSize && nc >= 0 && nc < state.boardSize) {
          if (state.board[nr][nc] === symbol) return true;
        }
      }
    }
    return false;
  }

  function isDraw(symbol, emptySlots) {
    if (winner(HUMAN) || winner(COMPUTER)) return false;

    let emptyCount = 0;
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        if (state.board[r][c] === EMPTY) emptyCount++;
      }
    }

    if (emptySlots === 0) return emptyCount === 0;
    if (emptyCount !== emptySlots) return false;

    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        if (state.board[r][c] === EMPTY && hasAdjacentSymbol(r, c, symbol)) {
          return false;
        }
      }
    }
    return true;
  }

  function evaluate(symbol, emptySlots) {
    if (winner(COMPUTER)) return 3;
    if (winner(HUMAN)) return 0;
    if (isDraw(symbol, emptySlots)) return 2;
    return 1;
  }

  function boardKey() {
    let out = "";
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        out += state.board[r][c];
      }
    }
    return out;
  }

  function clampInt(val, min, max, fallback) {
    const parsed = parseInt(val, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function opponentOf(symbol) {
    return symbol === HUMAN ? COMPUTER : HUMAN;
  }

  startNewGame();
})();
