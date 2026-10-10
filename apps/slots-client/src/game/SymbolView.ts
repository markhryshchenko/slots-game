import { Container, Graphics, Text } from "pixi.js";
import { symbolStyle } from "./symbolStyles.js";

const PADDING = 6;

/** One cell of a reel: a coloured plate with the symbol's name. */
export class SymbolView extends Container {
  private readonly plate = new Graphics();
  private readonly caption: Text;
  private current = "";

  constructor(private readonly size: number) {
    super();
    this.caption = new Text({
      text: "",
      style: { fontFamily: "system-ui, sans-serif", fontWeight: "800", fontSize: Math.round(size * 0.2) },
    });
    this.caption.anchor.set(0.5);
    this.caption.position.set(size / 2, size / 2);
    this.addChild(this.plate, this.caption);
  }

  get symbol(): string {
    return this.current;
  }

  setSymbol(symbol: string): void {
    if (symbol === this.current) return;
    this.current = symbol;

    const style = symbolStyle(symbol);
    const inner = this.size - PADDING * 2;

    this.plate.clear().roundRect(PADDING, PADDING, inner, inner, 14).fill(style.fill);
    this.caption.text = style.label;
    this.caption.style.fill = style.text;
    this.caption.style.fontSize = Math.round(this.size * (style.label.length > 2 ? 0.17 : 0.45));
  }

  setHighlighted(on: boolean): void {
    this.alpha = on ? 1 : 0.35;
  }
}
