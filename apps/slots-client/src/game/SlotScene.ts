import { Container, Graphics } from "pixi.js";
import type { GameRules, Win } from "../api/types.js";
import { ReelView } from "./ReelView.js";

const CELL = 140;
const GAP = 12;
const MARGIN = 20;
const STOP_STAGGER_MS = 220;
const LINE_COLORS = [0xffffff, 0x4cc9f0, 0xff70a6, 0x80ed99, 0xff9f1c];

/** The playfield: reels side by side and an overlay for winning lines. */
export class SlotScene extends Container {
  readonly widthPx: number;
  readonly heightPx: number;
  private readonly reels: ReelView[] = [];
  private readonly lines = new Graphics();

  constructor(private readonly rules: GameRules) {
    super();
    this.widthPx = MARGIN * 2 + rules.reels * CELL + (rules.reels - 1) * GAP;
    this.heightPx = MARGIN * 2 + rules.rows * CELL;

    this.addChild(
      new Graphics().roundRect(0, 0, this.widthPx, this.heightPx, 16).fill(0x1e1a2e),
    );

    for (let i = 0; i < rules.reels; i++) {
      const reel = new ReelView(rules.symbols, rules.rows, CELL);
      reel.position.set(MARGIN + i * (CELL + GAP), MARGIN);
      this.reels.push(reel);
      this.addChild(reel);
    }

    this.addChild(this.lines);
  }

  update(deltaMs: number): void {
    for (const reel of this.reels) reel.update(deltaMs);
  }

  /** What the player sees now, as grid[row][reel]. */
  visibleGrid(): string[][] {
    const columns = this.reels.map((reel) => reel.visibleColumn());
    return Array.from({ length: this.rules.rows }, (_, row) =>
      columns.map((column) => column[row] ?? ""),
    );
  }

  start(): void {
    this.lines.clear();
    for (const reel of this.reels) reel.start();
  }

  /** Stops the reels left to right on the server's grid (grid[row][reel]). */
  async stopOn(grid: readonly (readonly string[])[]): Promise<void> {
    await Promise.all(
      this.reels.map(async (reel, reelIndex) => {
        await delay(reelIndex * STOP_STAGGER_MS);
        await reel.stop(grid.map((row) => {
          const symbol = row[reelIndex];
          if (symbol === undefined) throw new Error(`Grid has no reel ${reelIndex}`);
          return symbol;
        }));
      }),
    );
  }

  /** Draws each winning payline and dims the cells that did not win. */
  showWins(wins: readonly Win[]): void {
    this.lines.clear();
    if (wins.length === 0) return;

    const bright = this.reels.map(() => new Set<number>());

    wins.forEach((win, index) => {
      const line = this.rules.paylines.find((payline) => payline.id === win.paylineId);
      if (!line) return;

      const points = line.rows.map((row, reelIndex) => ({
        x: MARGIN + reelIndex * (CELL + GAP) + CELL / 2,
        y: MARGIN + row * CELL + CELL / 2,
      }));
      const [first, ...rest] = points;
      if (!first) return;

      this.lines.moveTo(first.x, first.y);
      for (const point of rest) this.lines.lineTo(point.x, point.y);
      this.lines.stroke({ width: 8, color: LINE_COLORS[index % LINE_COLORS.length] ?? 0xffffff, cap: "round", join: "round" });

      line.rows.forEach((row, reelIndex) => bright[reelIndex]?.add(row));
    });

    this.reels.forEach((reel, index) => reel.setHighlighted(bright[index]));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
