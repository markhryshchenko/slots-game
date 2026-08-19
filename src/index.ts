import { MathRNG } from "./game/MathRNG.js";
import { createGrid } from "./game/createGrid.js";
import { createReels } from "./game/createReels.js";
import { classic96 } from "./game/math/rtp96.js";

const rng = new MathRNG();

const reels = createReels(classic96, rng);

const stops = reels.map((reel) => reel.spin());

const grid = createGrid(reels, stops);

console.log("Stops:", stops);
console.table(grid);