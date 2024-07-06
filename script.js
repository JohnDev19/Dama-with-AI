const board = document.getElementById('board');
const startButton = document.getElementById('start');
const statusDisplay = document.getElementById('status');
const playerScoreDisplay = document.getElementById('player-score');
const aiScoreDisplay = document.getElementById('ai-score');
const levelDisplay = document.getElementById('level-display');

let gameState = [];
let currentPlayer = 'player';
let selectedPiece = null;
let scores = { player: 12, ai: 12 };
let currentLevel = 1;
let gameActive = false;

function initializeBoard() {
    gameState = Array(8).fill().map(() => Array(8).fill(null));
    board.innerHTML = '';
    scores = { player: 12, ai: 12 };
    updateScoreDisplay();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', (row + col) % 2 === 0 ? 'white' : 'black');
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (row < 3 && (row + col) % 2 !== 0) {
                gameState[row][col] = { player: 'ai', isKing: false };
                const piece = createPiece('ai');
                cell.appendChild(piece);
            } else if (row > 4 && (row + col) % 2 !== 0) {
                gameState[row][col] = { player: 'player', isKing: false };
                const piece = createPiece('player');
                cell.appendChild(piece);
            }

            cell.addEventListener('click', handleCellClick);
            board.appendChild(cell);
        }
    }
    currentPlayer = 'player';
    updateStatus();
    updatePrediction();
    updateStrategy();
}

function createPiece(player) {
    const piece = document.createElement('div');
    piece.classList.add('piece', player);
    return piece;
}

function handleCellClick(e) {
    if (!gameActive || currentPlayer !== 'player') return;

    const cell = e.target.closest('.cell');
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (selectedPiece) {
        const selectedRow = parseInt(selectedPiece.parentElement.dataset.row);
        const selectedCol = parseInt(selectedPiece.parentElement.dataset.col);

        const moves = getValidMoves(selectedRow, selectedCol);
        const move = moves.find(m => m.toRow === row && m.toCol === col);

        if (move) {
            movePiece(selectedRow, selectedCol, row, col, move.capturedPieces);
            deselectPiece();
            if (!checkForMoreJumps(row, col)) {
                switchPlayer();
            }
        } else {
            deselectPiece();
        }
    } else if (gameState[row][col] && gameState[row][col].player === 'player') {
        selectPiece(cell.firstChild);
        showValidMoves(row, col);
    }
}

function selectPiece(piece) {
    deselectPiece();
    selectedPiece = piece;
    piece.classList.add('selected');
}

function deselectPiece() {
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }
    clearValidMoves();
}

function clearValidMoves() {
    document.querySelectorAll('.valid-move').forEach(cell => cell.classList.remove('valid-move'));
}

function showValidMoves(row, col) {
    const moves = getValidMoves(row, col);
    moves.forEach(move => {
        const cell = document.querySelector(`.cell[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
        cell.classList.add('valid-move');
    });
}

function getValidMoves(row, col) {
    const piece = gameState[row][col];
    const moves = [];

    if (!piece) return moves;

    const directions = piece.isKing ? [-1, 1] : (piece.player === 'player' ? [-1] : [1]);

    directions.forEach(rowDir => {
        [-1, 1].forEach(colDir => {
            if (piece.isKing) {
                moves.push(...getKingMoves(row, col, rowDir, colDir));
            } else {
                moves.push(...getNormalMoves(row, col, rowDir, colDir));
            }
        });
    });

    return moves;
}

function getKingMoves(row, col, rowDir, colDir) {
    const moves = [];
    let newRow = row + rowDir;
    let newCol = col + colDir;
    let capturedPieces = [];

    while (isValidPosition(newRow, newCol)) {
        if (!gameState[newRow][newCol]) {
            moves.push({ toRow: newRow, toCol: newCol, capturedPieces: [...capturedPieces] });
        } else if (gameState[newRow][newCol].player !== gameState[row][col].player) {
            capturedPieces.push({ row: newRow, col: newCol });
            newRow += rowDir;
            newCol += colDir;
            if (isValidPosition(newRow, newCol) && !gameState[newRow][newCol]) {
                moves.push({ toRow: newRow, toCol: newCol, capturedPieces: [...capturedPieces] });
            } else {
                break;
            }
        } else {
            break;
        }
        newRow += rowDir;
        newCol += colDir;
    }

    return moves;
}

function getNormalMoves(row, col, rowDir, colDir) {
    const moves = [];
    let newRow = row + rowDir;
    let newCol = col + colDir;

    if (isValidPosition(newRow, newCol)) {
        if (!gameState[newRow][newCol]) {
            moves.push({ toRow: newRow, toCol: newCol, capturedPieces: [] });
        } else if (gameState[newRow][newCol].player !== gameState[row][col].player) {
            let jumpRow = newRow + rowDir;
            let jumpCol = newCol + colDir;
            if (isValidPosition(jumpRow, jumpCol) && !gameState[jumpRow][jumpCol]) {
                moves.push({ toRow: jumpRow, toCol: jumpCol, capturedPieces: [{ row: newRow, col: newCol }] });
            }
        }
    }

    return moves;
}

function isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function movePiece(fromRow, fromCol, toRow, toCol, capturedPieces) {
    const piece = gameState[fromRow][fromCol];
    gameState[toRow][toCol] = piece;
    gameState[fromRow][fromCol] = null;

    if ((toRow === 0 && piece.player === 'player') || (toRow === 7 && piece.player === 'ai')) {
        piece.isKing = true;
    }

    const fromCell = document.querySelector(`.cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
    const toCell = document.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);

    const pieceElement = fromCell.firstChild;
    pieceElement.style.transition = 'transform 0.3s ease';
    pieceElement.style.transform = `translate(${(toCol - fromCol) * 100}%, ${(toRow - fromRow) * 100}%)`;

    setTimeout(() => {
        fromCell.removeChild(pieceElement);
        pieceElement.style.transform = '';
        if (piece.isKing) pieceElement.classList.add('king');
        toCell.appendChild(pieceElement);

        capturedPieces.forEach(capturedPiece => {
            const capturedCell = document.querySelector(`.cell[data-row="${capturedPiece.row}"][data-col="${capturedPiece.col}"]`);
            capturedCell.removeChild(capturedCell.firstChild);
            gameState[capturedPiece.row][capturedPiece.col] = null;
            scores[piece.player === 'player' ? 'ai' : 'player']--;
        });
        updateScoreDisplay();

        checkGameOver();
        updatePrediction();
        updateStrategy();
    }, 300);
}

function checkForMoreJumps(row, col) {
    const moves = getValidMoves(row, col);
    return moves.some(move => move.capturedPieces.length > 0);
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'player' ? 'ai' : 'player';
    updateStatus();
    if (currentPlayer === 'ai') {
        setTimeout(makeAIMove, 500);
    }
}

function updateStatus() {
    statusDisplay.textContent = `${currentPlayer === 'player' ? 'Player' : 'AI'}'s turn`;
}

function updateScoreDisplay() {
    playerScoreDisplay.textContent = `Player: ${scores.player}`;
    aiScoreDisplay.textContent = `AI: ${scores.ai}`;
}

function makeAIMove() {
    const aiMoves = getAllPossibleMoves('ai');
    if (aiMoves.length === 0) {
        gameOver('player');
        return;
    }

    let bestMove;
    if (Math.random() * 100 < currentLevel * 5) {
        bestMove = getBestMove(aiMoves);
    } else {
        bestMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
    }

    movePiece(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove.capturedPieces);
    
    if (bestMove.capturedPieces.length > 0 && checkForMoreJumps(bestMove.toRow, bestMove.toCol)) {
        setTimeout(makeAIMove, 500);
    } else {
        switchPlayer();
    }
}

function getAllPossibleMoves(player) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState[row][col] && gameState[row][col].player === player) {
                const pieceMoves = getValidMoves(row, col);
                pieceMoves.forEach(move => {
                    moves.push({...move, fromRow: row, fromCol: col});
                });
            }
        }
    }
    return moves;
}

function getBestMove(moves) {
    const captureMoves = moves.filter(move => move.capturedPieces.length > 0);
    if (captureMoves.length > 0) {
        return captureMoves.reduce((best, move) => 
            move.capturedPieces.length > best.capturedPieces.length ? move : best
        );
    }

    const kingMoves = moves.filter(move => gameState[move.fromRow][move.fromCol].isKing);
    if (kingMoves.length > 0) {
        return kingMoves[Math.floor(Math.random() * kingMoves.length)];
    }

    const forwardMoves = moves.filter(move => move.toRow > move.fromRow);
    if (forwardMoves.length > 0) {
        return forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
}

function checkGameOver() {
    const playerMoves = getAllPossibleMoves('player');
    const aiMoves = getAllPossibleMoves('ai');

    if (playerMoves.length === 0 || scores.player === 0) {
        gameOver('ai');
    } else if (aiMoves.length === 0 || scores.ai === 0) {
        gameOver('player');
    }
}

function gameOver(winner) {
    gameActive = false;
    if (winner === 'player') {
        currentLevel++;
        statusDisplay.textContent = `Congratulations! You won! Advancing to Level ${currentLevel}`;
    } else {
        statusDisplay.textContent = `Game Over! AI wins. Try again at Level ${currentLevel}`;
    }
    levelDisplay.textContent = `Level: ${currentLevel}`;
    startButton.textContent = 'Play Again';
}

function updatePrediction() {
    const playerScore = evaluatePosition('player');
    const aiScore = evaluatePosition('ai');
    
    let prediction;
    if (playerScore > aiScore) {
        prediction = `Player advantage: ${((playerScore - aiScore) / Math.max(playerScore, aiScore) * 100).toFixed(1)}%`;
    } else if (aiScore > playerScore) {
        prediction = `AI advantage: ${((aiScore - playerScore) / Math.max(playerScore, aiScore) * 100).toFixed(1)}%`;
    } else {
        prediction = "Even position";
    }
    
    statusDisplay.textContent += ` | ${prediction}`;
}

function evaluatePosition(player) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.player === player) {
                score += piece.isKing ? 3 : 1;
                score += (player === 'player' ? 7 - row : row) * 0.1;
            }
        }
    }
    return score;
}

function updateStrategy() {
    if (currentPlayer === 'player') {
        const playerMoves = getAllPossibleMoves('player');
        const captureMoves = playerMoves.filter(move => move.capturedPieces.length > 0);
        const kingMoves = playerMoves.filter(move => gameState[move.fromRow][move.fromCol].isKing);
        
        let strategy = "Strategy: ";
        if (captureMoves.length > 0) {
            strategy += "Capture opportunities available. ";
        } else if (kingMoves.length > 0) {
            strategy += "Use your kings for advantage. ";
        } else {
            strategy += "Advance carefully. ";
        }
        
        if (scores.player > scores.ai) {
            strategy += "Maintain your lead. ";
        } else if (scores.ai > scores.player) {
            strategy += "Look for captures. ";
        }
        
        statusDisplay.textContent += ` | ${strategy}`;
    }
}

startButton.addEventListener('click', () => {
    initializeBoard();
    gameActive = true;
    startButton.textContent = 'Restart';
    statusDisplay.textContent = "Player's turn";
    levelDisplay.textContent = `Level: ${currentLevel}`;
    updatePrediction();
    updateStrategy();
});

initializeBoard();