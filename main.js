// Import the piece matrices from an external module
import { pieceMatrices } from "./modules/pieceMatrices.mjs";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

// Load the image to represent the pieces
const pieceSprite = new Image();
pieceSprite.src = "./assets/B1.png";

// Define constants for piece size, grid size, number of pieces, and spacing between pieces
const PIECE_SIZE = 40,
  GRID_SIZE = 8,
  NUM_PIECES = 3,
  SPACING = 10;

// Define variables to manage the grid, pieces, dragging behavior, and piece placement
let gridX,
  gridY,
  pieces = [],
  currentPiece = null,
  isDragging = false,
  dragOffset = { x: 0, y: 0 },
  piecesPlaced = 0;
let gridMatrix = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

// Adjust the canvas size when the window is resized
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gridX = (canvas.width - GRID_SIZE * PIECE_SIZE) / 2;
  gridY = canvas.height * 0.2;
  initializePieces(); // Initialize pieces once the canvas is resized
  redraw(); // Redraw the entire canvas with the updated dimensions
}

// Initialize the pieces below the grid, setting their position and size
function initializePieces() {
  const gridBottom = gridY + GRID_SIZE * PIECE_SIZE;
  const availableWidth = canvas.width * 0.6;
  const pieceAreaTop = gridBottom + SPACING;
  const pieceAreaHeight = canvas.height - pieceAreaTop - SPACING;
  const effectivePieceSize = Math.min(
    (availableWidth - (NUM_PIECES - 1) * SPACING) / NUM_PIECES,
    pieceAreaHeight,
    PIECE_SIZE * 4
  );
  const totalWidth = NUM_PIECES * effectivePieceSize + (NUM_PIECES - 1) * SPACING;
  const startX = (canvas.width - totalWidth) / 2;

  // Generate random pieces and position them below the grid
  pieces = Array.from({ length: NUM_PIECES }, (_, i) => {
    const pieceType = Object.keys(pieceMatrices)[Math.floor(Math.random() * Object.keys(pieceMatrices).length)];
    const pieceMatrix = pieceMatrices[pieceType][Math.floor(Math.random() * pieceMatrices[pieceType].length)];
    return {
      pieceMatrix,
      pieceX: startX + i * (effectivePieceSize + SPACING),
      pieceY: pieceAreaTop + (pieceAreaHeight - effectivePieceSize) / 2,
      pieceWidth: PIECE_SIZE * pieceMatrix[0].length,
      pieceHeight: PIECE_SIZE * pieceMatrix.length,
      type: pieceType,
    };
  });
}

// Draw the grid on the canvas
function drawGrid() {
  ctx.strokeStyle = "gray";
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = gridX + j * PIECE_SIZE,
        y = gridY + i * PIECE_SIZE;
      ctx.strokeRect(x, y, PIECE_SIZE, PIECE_SIZE);
      if (gridMatrix[i][j]) ctx.drawImage(pieceSprite, x, y, PIECE_SIZE, PIECE_SIZE); // Draw pieces in the grid if present
    }
  }
}

// Draw a piece on the canvas
function drawPiece(piece) {
  piece.pieceMatrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell)
        ctx.drawImage(
          pieceSprite,
          piece.pieceX + j * PIECE_SIZE,
          piece.pieceY + i * PIECE_SIZE,
          PIECE_SIZE,
          PIECE_SIZE
        );
    });
  });
}

// Redraw the entire canvas including the grid and pieces
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  pieces.forEach(drawPiece);
}

// Snap the piece to the nearest grid position after dragging
function snapPieceToGrid(piece) {
  piece.pieceX = Math.round((piece.pieceX - gridX) / PIECE_SIZE) * PIECE_SIZE + gridX;
  piece.pieceY = Math.round((piece.pieceY - gridY) / PIECE_SIZE) * PIECE_SIZE + gridY;
}

// Check if a piece can be placed on the grid
function canPlacePieceOnGrid(piece) {
  const gridXIndex = Math.floor((piece.pieceX - gridX) / PIECE_SIZE);
  const gridYIndex = Math.floor((piece.pieceY - gridY) / PIECE_SIZE);
  return piece.pieceMatrix.every((row, i) =>
    row.every((cell, j) => {
      if (!cell) return true;
      const x = gridXIndex + j,
        y = gridYIndex + i;
      return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !gridMatrix[y][x];
    })
  );
}

// Store the piece in the grid matrix and remove it from the canvas
function storePieceInMatrixAndDelete(piece) {
  const gridXIndex = Math.floor((piece.pieceX - gridX) / PIECE_SIZE);
  const gridYIndex = Math.floor((piece.pieceY - gridY) / PIECE_SIZE);
  piece.pieceMatrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell) gridMatrix[gridYIndex + i][gridXIndex + j] = 1; // Mark grid cells as filled
    });
  });
  clearFullRowsAndColumns(); // Clear any full rows or columns
  checkAndRegeneratePieces(); // Check if new pieces need to be generated
}

// Clear full rows and columns in the grid
function clearFullRowsAndColumns() {
  gridMatrix = gridMatrix.filter((row) => row.some((cell) => !cell)); // Remove full rows
  while (gridMatrix.length < GRID_SIZE) gridMatrix.unshift(Array(GRID_SIZE).fill(0)); // Add empty rows if needed

  // Clear full columns
  for (let col = 0; col < GRID_SIZE; col++) {
    if (gridMatrix.every((row) => row[col])) {
      gridMatrix.forEach((row) => (row[col] = 0)); // Clear the column
    }
  }
  redraw(); // Redraw the updated grid
}

// Check if new pieces need to be generated and regenerate them if necessary
function checkAndRegeneratePieces() {
  if (++piecesPlaced >= NUM_PIECES) {
    piecesPlaced = 0;
    initializePieces(); // Regenerate new pieces
    redraw(); // Redraw the canvas with new pieces
  }
}

// Check if a point (x, y) is inside a specific piece
function isPointInPiece(x, y, piece) {
  if (
    x >= piece.pieceX &&
    x < piece.pieceX + piece.pieceWidth &&
    y >= piece.pieceY &&
    y < piece.pieceY + piece.pieceHeight
  ) {
    const i = Math.floor((y - piece.pieceY) / PIECE_SIZE);
    const j = Math.floor((x - piece.pieceX) / PIECE_SIZE);
    return piece.pieceMatrix[i] && piece.pieceMatrix[i][j]; // Check if the point is inside the piece matrix
  }
  return false;
}

// Event listener for when the mouse button is pressed
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left,
    y = e.clientY - rect.top;
  currentPiece = pieces.find((piece) => isPointInPiece(x, y, piece)); // Find the piece under the cursor
  if (currentPiece) {
    isDragging = true;
    dragOffset = { x: x - currentPiece.pieceX, y: y - currentPiece.pieceY }; // Calculate drag offset
  }
});

// Event listener for when the mouse is moved
canvas.addEventListener("mousemove", (e) => {
  if (isDragging && currentPiece) {
    const rect = canvas.getBoundingClientRect();
    currentPiece.pieceX = e.clientX - rect.left - dragOffset.x;
    currentPiece.pieceY = e.clientY - rect.top - dragOffset.y;

    // Constrain the piece within the canvas boundaries
    currentPiece.pieceX = Math.max(0, Math.min(currentPiece.pieceX, canvas.width - currentPiece.pieceWidth));
    currentPiece.pieceY = Math.max(0, Math.min(currentPiece.pieceY, canvas.height - currentPiece.pieceHeight));

    redraw(); // Redraw while dragging
  }
});

// Event listener for when the mouse button is released
canvas.addEventListener("mouseup", () => {
  if (isDragging && currentPiece) {
    snapPieceToGrid(currentPiece); // Snap the piece to the grid
    if (canPlacePieceOnGrid(currentPiece)) {
      storePieceInMatrixAndDelete(currentPiece); // Store the piece if it can be placed
      pieces = pieces.filter((piece) => piece !== currentPiece); // Remove the piece from the array
    }
    redraw(); // Redraw after the piece is placed
  }
  isDragging = false; // Stop dragging
});

// Event listener for window resize
window.addEventListener("resize", resizeCanvas);

// Once the piece sprite is loaded, resize the canvas and initialize the pieces
pieceSprite.onload = () => {
  resizeCanvas();
  initializePieces();
  redraw();
};
