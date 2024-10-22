import { pieceMatrices } from "./modules/pieceMatrices.mjs";
import { addQuestion, getRandomQuestion, popupRandom, checkResponse } from "./modules/quiz.mjs";

const scoreDisplay = document.querySelector(".score");

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const pieceSprite = new Image();
pieceSprite.src = "./assets/tile.png";

/** @type {number} */
let score = 0;
/** @type {number} */
const LINE_CLEAR_DELAY = 20;
/** @type {number} */
const POINTS_PER_TILE = 10;
/** @type {number} */
const NUM_PIECES = 3;
/** @type {number} */
const GRID_SIZE = 8;
/** @type {number} */
let PIECE_SIZE = 40;
/** @type {number} */
let SPACING = 10;
/** @type {Piece[]} */
let pieces = [];
/** @type {Piece} */
let currentPiece = null;
/** @type {number[][]} */
let matrix = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
let [gridX, gridY] = [100, 100];

/** @type {boolean} */
let isDragging = false;
/** @property {number} x */
/** @property {number} y */
let dragOffset = { x: 0, y: 0 };
/** @type {boolean} */
let runningAnimation = false;

let piecesPlaced = 0;

/**
 * @param {boolean} status
 */
export function setAnimationStatus(status) {
  runningAnimation = status;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number[3]}
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {number[3]}
 */
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * @returns {CanvasImageSource}
 */
function randomPieceImage() {
  const fakeCanvas = document.createElement("canvas");
  [fakeCanvas.width, fakeCanvas.height] = [pieceSprite.width, pieceSprite.height];
  fakeCanvas.getContext("2d").drawImage(pieceSprite, 0, 0, fakeCanvas.width, fakeCanvas.height);
  let image = fakeCanvas.getContext("2d").getImageData(0, 0, fakeCanvas.width, fakeCanvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    let r = image.data[i];
    let g = image.data[i + 1];
    let b = image.data[i + 2];

    image.data[i] = (r + 900) % 256;
  }
  return image;
}

class Piece {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number[][]} matrix
   * @returns {void}
   */
  constructor(x, y, width, height, matrix) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.matrix = matrix;

    this.originalX = x;
    this.originalY = y;

    // this.pieceImage = randomPieceImage();
  }
  /** @returns {void} */
  draw() {
    this.matrix.forEach((row, dy) => {
      row.forEach((cell, dx) => {
        if (cell) {
          ctx.drawImage(
            // this.pieceImage,
            pieceSprite,
            this.x + dx * PIECE_SIZE,
            this.y + dy * PIECE_SIZE,
            PIECE_SIZE,
            PIECE_SIZE
          );
        }
      });
    });
  }
  /** @returns {void} */
  resetPosition() {
    [this.x, this.y] = [this.originalX, this.originalY];
  }
}

/** @returns {void} */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gridX = (canvas.width - GRID_SIZE * PIECE_SIZE) / 2;
  redraw();
  gridY = canvas.height * 0.2;
}

/** @returns {void} */
function initializePieces() {
  const gridBottom = gridY + GRID_SIZE * PIECE_SIZE;
  const availableWidth = canvas.width * 0.6;
  const pieceTop = gridBottom + SPACING;
  const pieceMaxHeight = canvas.height - pieceTop - SPACING;
  const effectivePieceSize = Math.min(
    (availableWidth - (NUM_PIECES - 1) * SPACING) / NUM_PIECES,
    pieceMaxHeight,
    PIECE_SIZE * 4
  );
  const totalWidth = NUM_PIECES * effectivePieceSize + (NUM_PIECES - 1) * SPACING;
  const startX = (canvas.width - totalWidth) / 2;

  pieces = Array.from({ length: NUM_PIECES }, (_, i) => {
    const pieceType = Object.keys(pieceMatrices)[Math.floor(Math.random() * Object.keys(pieceMatrices).length)];
    const pieceMatrix = pieceMatrices[pieceType][Math.floor(Math.random() * pieceMatrices[pieceType].length)];
    let piece = new Piece(
      startX + i * (effectivePieceSize + SPACING),
      pieceTop + (pieceMaxHeight - effectivePieceSize) / 2,
      PIECE_SIZE * pieceMatrix[0].length,
      PIECE_SIZE * pieceMatrix.length,
      pieceMatrix
    );
    return piece;
  });
}

/** @returns {void} */
function drawGrid() {
  ctx.strokeStyle = "gray";
  for (let dy = 0; dy < GRID_SIZE; dy++) {
    for (let dx = 0; dx < GRID_SIZE; dx++) {
      const x = gridX + dx * PIECE_SIZE;
      const y = gridY + dy * PIECE_SIZE;
      ctx.strokeRect(x, y, PIECE_SIZE, PIECE_SIZE);
      if (matrix[dy][dx]) ctx.drawImage(pieceSprite, x, y, PIECE_SIZE, PIECE_SIZE);
    }
  }
}

/** @returns {void} */
export function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  pieces.forEach((v, _) => {
    if (v === null) return;
    v.draw();
  });
}

/**
 * @param {Piece} piece
 * @returns {void}
 */
function snapPieceToGrid(piece) {
  piece.x = Math.round((piece.x - gridX) / PIECE_SIZE) * PIECE_SIZE + gridX;
  piece.y = Math.round((piece.y - gridY) / PIECE_SIZE) * PIECE_SIZE + gridY;
}

/**
 * @param {Piece} piece
 * @returns {boolean}
 */
function canPlacePieceOnGrid(piece) {
  const gridXIndex = Math.round((piece.x - gridX) / PIECE_SIZE);
  const gridYIndex = Math.round((piece.y - gridY) / PIECE_SIZE);
  return piece.matrix.every((row, dy) =>
    row.every((cell, dx) => {
      if (!cell) return true;
      const x = gridXIndex + dx;
      const y = gridYIndex + dy;

      return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !matrix[y][x];
    })
  );
}

/**
 * @param {Piece} piece
 * @returns {void}
 */
function lockPiece(piece) {
  const gridXIndex = Math.round((piece.x - gridX) / PIECE_SIZE);
  const gridYIndex = Math.round((piece.y - gridY) / PIECE_SIZE);
  piece.matrix.forEach((row, dy) => {
    row.forEach((cell, dx) => {
      if (cell) {
        matrix[gridYIndex + dy][gridXIndex + dx] = 1;
      }
    });
  });
  pieces.forEach((piece, i) => {
    if (piece === currentPiece) {
      pieces[i] = null;
    }
  });
  doLineClears();
  regeneratePieces();
  piecesPlaced++;
  if (piecesPlaced % 8 == 0) {
    popupRandom();
  }
}

/** @returns {void} */
function doLineClears() {
  const rows = [];
  const cols = [];
  matrix.forEach((row, j) => {
    if (!row.some((cell) => !cell)) {
      rows.push(j);
    }
  });
  for (let x = 0; x < GRID_SIZE; x++) {
    let full_col = true;
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!matrix[y][x]) {
        full_col = false;
        break;
      }
    }
    if (full_col) cols.push(x);
  }
  if (!rows.length && !cols.length) return;
  runningAnimation = true;
  rows.forEach((row) => {
    for (let i = 0; i < GRID_SIZE; i++) {
      setTimeout(() => {
        matrix[row][i] = 0;
        redraw();
      }, LINE_CLEAR_DELAY * (i + 1));
    }
    addScore(10);
    setTimeout(() => {
      runningAnimation = false;
    }, LINE_CLEAR_DELAY * (GRID_SIZE + 1));
  });
  cols.forEach((col) => {
    for (let i = 0; i < GRID_SIZE; i++) {
      setTimeout(() => {
        matrix[i][col] = 0;
        redraw();
        setScore(score);
      }, LINE_CLEAR_DELAY * (i + 1));
    }
    addScore(10);
    setTimeout(() => {
      runningAnimation = false;
    }, LINE_CLEAR_DELAY * (GRID_SIZE + 1));
  });
}

/** @returns {void} */
function regeneratePieces() {
  if (pieces[0] === null && pieces[1] === null && pieces[2] === null) {
    initializePieces();
    redraw();
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Piece} piece
 * @returns {boolean}
 */
function isPointInPiece(x, y, piece) {
  if (!piece) return false;
  if (x >= piece.x && x < piece.x + piece.width && y >= piece.y && y < piece.y + piece.height) {
    const i = Math.floor((y - piece.y) / PIECE_SIZE);
    const j = Math.floor((x - piece.x) / PIECE_SIZE);
    return piece.matrix[i] && piece.matrix[i][j];
  }
  return false;
}

/**
 * @param {Piece} piece
 * @returns {boolean}
 */
function emptySpaceForPiece(piece) {
  if (piece === null) return false;
  const start = [piece.x, piece.y];
  const xMax = GRID_SIZE - piece.matrix[0].length;
  const yMax = GRID_SIZE - piece.matrix.length;
  for (let dy = 0; dy <= yMax; dy++) {
    for (let dx = 0; dx <= xMax; dx++) {
      const x = gridX + PIECE_SIZE * dx;
      const y = gridY + PIECE_SIZE * dy;
      [piece.x, piece.y] = [x, y];
      if (canPlacePieceOnGrid(piece)) {
        [piece.x, piece.y] = start;
        return true;
      }
    }
  }
  [piece.x, piece.y] = start;
  return false;
}

/** @param {MouseEvent} e */
canvas.onmousedown = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentPiece = pieces.find((piece) => isPointInPiece(x, y, piece));
  if (currentPiece && !runningAnimation) {
    isDragging = true;
    dragOffset = { x: x - currentPiece.x, y: y - currentPiece.y };
  }
};

/** @param {MouseEvent} e */
canvas.onmousemove = (e) => {
  if (isDragging && currentPiece) {
    const rect = canvas.getBoundingClientRect();
    currentPiece.x = e.clientX - rect.left - dragOffset.x;
    currentPiece.y = e.clientY - rect.top - dragOffset.y;

    currentPiece.x = Math.max(0, Math.min(currentPiece.x, canvas.width - currentPiece.width));
    currentPiece.y = Math.max(0, Math.min(currentPiece.y, canvas.height - currentPiece.height));

    redraw();
  }
};

export function gameOverAnimation() {
  runningAnimation = true;
  setTimeout(() => {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        setTimeout(() => {
          matrix[y][x] = 1;
          redraw();
        }, (x + y) * LINE_CLEAR_DELAY);
      }
    }
  }, 300);
}

/**
 * @param {number} score
 * @returns {void}
 */
function setScore(score) {
  scoreDisplay.innerText = Math.round(score);
}

const MAX_SCORE_TIME = 200;
const MAX_UPDATES = 10;
/**
 * @param {number} ds
 * @returns {void}
 */
export function addScore(ds) {
  let dt = MAX_SCORE_TIME / MAX_UPDATES;
  let ds_dt = ds / MAX_UPDATES;
  for (let i = 0; i < MAX_UPDATES; i++) {
    setTimeout(() => {
      score += ds_dt;
      setScore(score);
    }, dt * i);
  }
}

canvas.onmouseup = () => {
  if (isDragging && currentPiece) {
    if (canPlacePieceOnGrid(currentPiece)) {
      let numTiles = 0;
      /** @param {number[]} element */
      currentPiece.matrix.forEach((element) => {
        element.forEach((t) => {
          if (t) numTiles++;
        });
      });
      addScore(numTiles);
      snapPieceToGrid(currentPiece);
      lockPiece(currentPiece);
      updateQuestionStatus();
      if (!pieces.some((piece) => emptySpaceForPiece(piece))) {
        gameOverAnimation();
      }
    } else {
      currentPiece.resetPosition();
    }
    redraw();
  }
  isDragging = false;
};

/** @param {KeyboardEvent} e */
document.onkeydown = (e) => {
  if (runningAnimation) return;
  switch (e.key) {
    case "1": {
      currentPiece = pieces[0];
      break;
    }
    case "2": {
      currentPiece = pieces[1];
      break;
    }
    case "3": {
      currentPiece = pieces[2];
      break;
    }
    case "ArrowLeft": {
      currentPiece.x -= PIECE_SIZE;
      snapPieceToGrid(currentPiece);
      redraw();
      break;
    }
    case "ArrowRight": {
      currentPiece.x += PIECE_SIZE;
      snapPieceToGrid(currentPiece);
      redraw();
      break;
    }
    case "ArrowDown": {
      currentPiece.y += PIECE_SIZE;
      snapPieceToGrid(currentPiece);
      redraw();
      break;
    }
    case "ArrowUp": {
      currentPiece.y -= PIECE_SIZE;
      snapPieceToGrid(currentPiece);
      redraw();
      break;
    }
    case "Enter": {
      if (canPlacePieceOnGrid(currentPiece)) {
        snapPieceToGrid(currentPiece);
        lockPiece(currentPiece);
        if (!pieces.some((piece) => emptySpaceForPiece(piece))) {
          gameOverAnimation();
        }
      } else {
        currentPiece.resetPosition();
      }
      redraw();
    }
  }
};

const questionStatus = document.querySelector(".question-status");
function updateQuestionStatus() {
  console.log(questionStatus);
}

window.onresize = resizeCanvas;

setScore(score);
pieceSprite.onload = () => {
  resizeCanvas();
  initializePieces();
  redraw();
};

addQuestion("Which part of the brain is primarily responsible for processing emotions?", "Amygdala", [
  "Cerebellum",
  "Hippocampus",
  "Thalamus",
]);
addQuestion("What is the term for the process by which a conditioned response gradually disappears?", "Extinction", [
  "Habituation",
  "Sensitization",
  "Spontaneous recovery",
]);
addQuestion(
  "Which psychological perspective focuses on the role of unconscious drives and childhood experiences?",
  "Psychodynamic",
  ["Behavioral", "Cognitive ", "Humanistic"]
);
