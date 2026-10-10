import { Container, Graphics } from "pixi.js";
import { SymbolView } from "./SymbolView.js";

const SPEED_CELLS_PER_SECOND = 14;

/**
 * One reel. While spinning it scrolls random symbols (decoration only: the
 * client has no reel strips); on stop it lands exactly on the column the
 * server returned.
 */
export class ReelView extends Container {
  /** cells[0] is a buffer above the window; cells[1..rows] are visible. */
  private readonly cells: SymbolView[] = [];
  private offset = 0;
  private spinning = false;
  private pendingStop: { column: readonly string[]; done: () => void } | undefined;

  constructor(
    private readonly symbols: readonly string[],
    private readonly rows: number,
    private readonly cellSize: number,
  ) {
    super();

    for (let i = 0; i <= rows; i++) {
      const cell = new SymbolView(cellSize);
      cell.setSymbol(this.randomSymbol());
      this.cells.push(cell);
      this.addChild(cell);
    }

    const mask = new Graphics().rect(0, 0, cellSize, rows * cellSize).fill(0xffffff);
    this.addChild(mask);
    this.mask = mask;
    this.layout();
  }

  start(): void {
    this.setHighlighted(undefined);
    this.pendingStop = undefined;
    this.spinning = true;
  }

  /** Resolves once the reel shows `column` (top to bottom). */
  stop(column: readonly string[]): Promise<void> {
    return new Promise((done) => {
      this.pendingStop = { column, done };
    });
  }

  update(deltaMs: number): void {
    if (!this.spinning) return;

    this.offset += (SPEED_CELLS_PER_SECOND * this.cellSize * deltaMs) / 1000;

    while (this.offset >= this.cellSize) {
      this.offset -= this.cellSize;

      if (this.pendingStop) {
        this.land(this.pendingStop.column);
        this.pendingStop.done();
        this.pendingStop = undefined;
        return;
      }

      // The bottom cell leaves the window and re-enters at the top.
      const bottom = this.cells.pop();
      if (!bottom) throw new Error("Reel has no cells");
      bottom.setSymbol(this.randomSymbol());
      this.cells.unshift(bottom);
    }

    this.layout();
  }

  /** Symbols in the window now, top to bottom. */
  visibleColumn(): string[] {
    return this.cells.slice(1).map((cell) => cell.symbol);
  }

  /** `rows` = row indexes to keep bright; undefined = all bright. */
  setHighlighted(rows: ReadonlySet<number> | undefined): void {
    this.cells.forEach((cell, index) => cell.setHighlighted(!rows || rows.has(index - 1)));
  }

  private land(column: readonly string[]): void {
    this.spinning = false;
    this.offset = 0;

    this.cells.forEach((cell, index) => {
      const symbol = index === 0 ? this.randomSymbol() : column[index - 1];
      if (symbol === undefined) throw new Error(`No symbol for row ${index - 1}`);
      cell.setSymbol(symbol);
    });

    this.layout();
  }

  private layout(): void {
    this.cells.forEach((cell, index) => {
      cell.y = (index - 1) * this.cellSize + this.offset;
    });
  }

  private randomSymbol(): string {
    const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
    if (symbol === undefined) throw new Error("Game has no symbols");
    return symbol;
  }
}
