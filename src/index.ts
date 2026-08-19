import { MathRNG } from "./game/MathRNG.js";
import { SlotMachine } from "./game/SlotMachine.js";

import { rtp96 } from "./game/math/rtp96.js";

const rng = new MathRNG();

const machine = new SlotMachine(
  rtp96,
  rng,
);

const result = machine.spin(1);

console.log("Stops:", result.stops);

console.table(result.grid);

console.log("Wins:", result.wins);

console.log("Total win:", result.totalWin);