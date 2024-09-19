import { pieceMatrices } from './modules/pieceMatrices.mjs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const pieceSprite = new Image();
pieceSprite.src = "./assets/B1.png";

/** @type {number} */
const LINE_CLEAR_DELAY = 20;
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
    }
    /** @returns {void} */
    draw() {
        this.matrix.forEach((row, dy) => {
            row.forEach((cell, dx) => {
                if (cell) {
                    ctx.drawImage(
                        pieceSprite,
                        this.x + dx * PIECE_SIZE,
                        this.y + dy * PIECE_SIZE,
                        PIECE_SIZE,
                        PIECE_SIZE,
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
            PIECE_SIZE * pieceMatrix[0].length, PIECE_SIZE * pieceMatrix.length,
            pieceMatrix,
        );
        return piece;
    });
}

/** @returns {void} */
function drawGrid() {
    ctx.strokeStyle = 'gray';
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
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    pieces.forEach((v, _) => {
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
    pieces = pieces.filter((piece) => piece !== currentPiece);
    doLineClears();
    regeneratePieces();
}

/** @returns {void} */
function doLineClears() {
    const rows = [];
    const cols = [];
    matrix.forEach((row, j) => { if (!row.some((cell) => !cell)) { rows.push(j); } });
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
        setTimeout(() => {
            runningAnimation = false;
        }, LINE_CLEAR_DELAY * (GRID_SIZE + 1));
    });
    cols.forEach((col) => {
        for (let i = 0; i < GRID_SIZE; i++) {
            setTimeout(() => {
                matrix[i][col] = 0;
                redraw();
            }, LINE_CLEAR_DELAY * (i + 1));
        }
        setTimeout(() => {
            runningAnimation = false;
        }, LINE_CLEAR_DELAY * (GRID_SIZE + 1));
    });
}

/** @returns {void} */
function regeneratePieces() {
    if (pieces.length == 0) {
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
    if (
        x >= piece.x &&
        x < piece.x + piece.width &&
        y >= piece.y &&
        y < piece.y + piece.height
    ) {
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
}

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
}

function gameOverAnimation() {
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

canvas.onmouseup = () => {
    if (isDragging && currentPiece) {
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
    isDragging = false;
}

window.onresize = resizeCanvas;

pieceSprite.onload = () => {
    resizeCanvas();
    initializePieces();
    redraw();
}
