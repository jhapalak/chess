class Board {
	constructor(board, table, onCellClick) {
		this.numRows = board.length;
		this.numCols = board.at(0)?.length;
		const cellSizeVmin = 90 / Math.max(this.numRows, this.numCols);
		board.forEach((row, r) => {
			const tr = document.createElement("tr");
			[...row].forEach((pieceName, c) => {
				const td = document.createElement("td");
				td.id = Board.idOf(new Vector(r, c));
				td.classList.add(((r + c) % 2) ? "dark" : "light");
				td.addEventListener("click", onCellClick);
				td.innerHTML = pieceNameToHTMLMap.get(pieceName);
				td.style.height = td.style.width = `${cellSizeVmin}vmin`;
				td.style.fontSize = `${cellSizeVmin * 0.7}vmin`;
				tr.appendChild(td);
			});
			table.appendChild(tr);
		});
		this.highlightedPositions = [];
	}
	movePiece(from, to) {
		const p = this.getPiece(from);
		this.setPiece(from, ".");
		this.setPiece(to, p);
	}
	setPiece(position, pieceName) {
		const cell = this.getCell(position);
		cell.innerHTML = pieceNameToHTMLMap.get(pieceName);
	}
	getPiece(position) {
		const str = this.getCell(position).innerHTML;
		const p = unicodePointToPieceNameMap.get(str.codePointAt());
		return p === EMPTY ? null : p;
	}
	getCell(position) {
		return document.getElementById(Board.idOf(position));
	}
	highlightCell(position, highlightClass) {
		this.getCell(position).classList.add(highlightClass);
		this.highlightedPositions.push(position);
	}
	clearHighlights() {
		for (const p of this.highlightedPositions) {
			const c = this.getCell(p);
			c.className = c.className.split(" ")[0];
		}
		this.highlightedPositions = [];
	}
	isOnBoard(position) {
		const { r, c } = position;
		return (0 <= r) && (r < this.numRows) &&
		       (0 <= c) && (c < this.numCols);
	}
	static ID_SEP = "-";
	static idOf(position) { return `${position.r}${Board.ID_SEP}${position.c}`; }
	static positionOf(id) { return new Vector(...id.split(Board.ID_SEP)); }
}

class Game {
	constructor(board, table) {
		if (!table) {
			table = document.createElement("table");
			document.body.appendChild(table);
		}
		this.board = new Board(board, table, this.onCellClick.bind(this));
		this.currentPlayer = "white";
		this.orient = 1;
		this.positionToMoveFrom = null;
		this.legalMoves = new Map();
		this.updateLegalMoves();
	}
	onCellClick(event) {
		const id = event.target.id;
		const position = Board.positionOf(id);
		const piece = this.getPiece(position);
		if (!this.positionToMoveFrom) {
			if (!piece || piece.color !== this.currentPlayer) {
				return;
			}
			this.highlightMoves(position);
			this.positionToMoveFrom = position;
		} else {
			this.clearHighlights();
			if (this.positionToMoveFrom.isEqualTo(position)) {
				this.positionToMoveFrom = null;
				return;
			}
			if (piece?.color === this.currentPlayer) {
				this.positionToMoveFrom = null;
				this.onCellClick(event);
				return;
			}
			if (!this.isLegalDestination(position)) {
				this.positionToMoveFrom = null;
				return;
			}
			this.makeMove(this.positionToMoveFrom, position);
			this.toggleTurn();
			this.positionToMoveFrom = null;
			this.updateLegalMoves();
		}
	}
	isLegalDestination(position) {
		const moves = this.legalMoves.get(Board.idOf(this.positionToMoveFrom));
		const dests = moves.map(move => move[0]).map(Board.idOf);
		return dests.includes(Board.idOf(position));
	}
	isPositionUnderAttack(position) {
		for (const [fromId, moves] of this.legalMoves) {
			const p = this.getPiece(Board.positionOf(fromId));
			if (p?.color === this.currentPlayer) {
				continue;
			}
			for (const [moveDest, moveType] of moves) {
				if (moveType === "capture" && moveDest.isEqualTo(position)) {
					return true;
				}
			}
		}
		return false;
	}
	getPiece(position) {
		if (!this.board.isOnBoard(position)) {
			return null;
		}
		const pieceName = this.board.getPiece(position);
		if (!pieceName) {
			return null;
		}
		const type = pieceName.toLowerCase();
		const color = (pieceName.toLowerCase() === pieceName) ?
			"white" : "black";
		return { type, color };
	}
	updateLegalMoves() {
		for (let r = 0; r < this.board.numRows; r++) {
			for (let c = 0; c < this.board.numCols; c++) {
				const position = new Vector(r, c);
				if (!this.getPiece(position)) {
					continue;
				}
				const id = Board.idOf(position);
				this.legalMoves.set(id, legalMoves(position, this));
			}
		}
	}
	highlightMoves(from) {
		this.board.highlightCell(from, "selected");
		for (const [dest, moveType] of this.legalMoves.get(Board.idOf(from))) {
			this.board.highlightCell(dest, `move-${moveType}`);
		}
	}
	isUnmovedPiece(position) {
		return this.numMovesMadeByPiece(position) === 0;
	}
	numMovesMadeByPiece(position) {
		return 0;
	}
	clearHighlights() { this.board.clearHighlights(); }
	makeMove(from, to) { this.board.movePiece(from, to); }
	toggleTurn() {
		const other = (this.currentPlayer === "white") ? "black" : "white";
		this.currentPlayer = other;
		this.orient *= -1;
	}
}

class Vector {
	constructor(r, c) { [this.r, this.c] = [Number(r), Number(c)]; }
	sum(v) { return new Vector(this.r + v.r, this.c + v.c); }
	scaled(s) { return new Vector(this.r * s, this.c * s); }
	isEqualTo(v) { return this.r === v.r && this.c === v.c; }
	toString() { return `(${this.r}, ${this.c})`; }
}

const EMPTY = ".";
const unicodePointToPieceNameMap = new Map([
	[9812, "k"], [9813, "q"], [9814, "r"], [9815, "b"], [9816, "n"], [9817, "p"],
	[9818, "K"], [9819, "Q"], [9820, "R"], [9821, "B"], [9822, "N"], [9823, "P"],
	[" ".codePointAt(), EMPTY],
]);

const pieceNameToHTMLMap = new Map();
for (const [code, name] of unicodePointToPieceNameMap) {
	pieceNameToHTMLMap.set(name, `&#${code};`);
}

function legalMoves(position, game) {
	const p = game.getPiece(position);
	if (!p) {
		return [];
	}
	const c = legalMovesByCondition(position, game, p);
	const r = legalMovesByRay(position, game, p);
	return c.concat(r);
}

function legalMovesByCondition(position, game, piece) {
	const moves = [];
	for (const condition of (moveConditions.get(piece.type) || [])) {
		const move = condition(position, game, piece);
		if (move) {
			moves.push(move);
		}
	}
	return moves;
}

function legalMovesByRay(position, game, piece) {
	const moves = [];
	for (const destIter of (moveRays.get(piece.type)|| [])) {
		for (const dest of destIter(position, game.orient)) {
			if (!game.board.isOnBoard(dest)) {
				break;
			}
			const destPiece = game.getPiece(dest);
			if (destPiece) {
				if (piece.color !== destPiece.color) {
					moves.push([dest, "capture"]);
				}
				break;
			} else {
				moves.push([dest, "displace"]);
			}
		}
	}
	return moves;
}

function ray(direction, maxSteps=Infinity) {
	function* destIter(position, orient) {
		for (let step = 1; step <= maxSteps; step++) {
			const d = direction.scaled(orient);
			yield position.sum(d.scaled(step));
		}
	}
	return destIter;
}

function pawnFront(position, game, piece, steps) {
	const front = d.front.scaled(game.orient);
	const dest = position.sum(front.scaled(steps));
	const p = game.getPiece(dest);
	if (!p) {
		return [dest, "displace"];
	}
}
function pawnFront1(position, game, piece) {
	return pawnFront(position, game, piece, 1);
}
function pawnFront2(position, game, piece) {
	if (!pawnFront1(position, game, piece) ||
	    !game.isUnmovedPiece(position)) {
		return;
	}
	return pawnFront(position, game, piece, 2);
}

function pawnCapture(direction) {
	function condition(position, game, piece) {
		const dir = direction.scaled(game.orient);
		const front = d.front.scaled(game.orient);
		const dest = position.sum(dir).sum(front);
		const p = game.getPiece(dest);
		if (p && p.color !== piece.color) {
			return [dest, "capture"];
		}
	}
	return condition;
}

function pawnEnpassant(position, game, piece) {
}

function pawnPromote(position, game, piece) {
}

function kingMove(direction) {
	function condition(position, game, piece) {
		const dest = position.sum(direction);
		if (!game.board.isOnBoard(dest)) {
			return;
		}
		const p = game.getPiece(dest);
		if (p?.color === piece.color ||
		    game.isPositionUnderAttack(dest)) {
			return;
		}
		return [dest, p ? "capture" : "displace" ];
	}
	return condition;
}

function kingCastle(position, game, piece) {
}

const d = {
	"front": new Vector(-1,  0),
	"back":  new Vector(+1,  0),
	"left":  new Vector( 0, -1),
	"right": new Vector( 0, +1),
};

const moveConditions = new Map([
	["k",  [kingMove(d.left), kingMove(d.right),
		kingMove(d.front), kingMove(d.back),
		kingMove(d.front.sum(d.left)), kingMove(d.front.sum(d.right)),
		kingMove(d.back.sum(d.left)), kingMove(d.back.sum(d.right)),
		kingCastle]],
	["p",  [pawnFront1, pawnFront2,
		pawnCapture(d.left), pawnCapture(d.right),
		pawnEnpassant,
		pawnPromote]],
]);

const moveRays = new Map([
	["r",  [ray(d.front), ray(d.back), ray(d.left), ray(d.right)]],
	["b",  [ray(d.front.sum(d.left)), ray(d.front.sum(d.right)),
		ray(d.back.sum(d.left)), ray(d.back.sum(d.right))]],
	["n",  [ray(d.front.scaled(2).sum(d.left), 1), ray(d.front.scaled(2).sum(d.right), 1),
		ray(d.back.scaled(2).sum(d.left), 1), ray(d.back.scaled(2).sum(d.right), 1),
		ray(d.left.scaled(2).sum(d.front), 1), ray(d.left.scaled(2).sum(d.back), 1),
		ray(d.right.scaled(2).sum(d.front), 1), ray(d.right.scaled(2).sum(d.back), 1)]],
]);
moveRays.set("q", moveRays.get("r").concat(moveRays.get("b")));

const game = new Game([
	"RNBQKBNR",
	"PPPPPPPP",
	"........",
	"........",
	"........",
	"........",
	"pppppppp",
	"rnbqkbnr",
]);
