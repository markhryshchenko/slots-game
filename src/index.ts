import { MathRNG } from "./game/MathRNG.js";
import { SlotMachine } from "./game/SlotMachine.js";
import { ReelAnalyzer } from "./game/math/ReelAnalyzer.js";

import { rtp96 } from "./game/math/rtp96.js";
import { MathSimulator } from "./simulation/MathSimulator.js";

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

const simulator = new MathSimulator(machine);

const resSim = simulator.run(
  1_000_000,
  1,
);

console.table(resSim);

const analyzer = new ReelAnalyzer();

const distribution = analyzer.analyze(
  rtp96.reels[0].strip,
);

console.table(distribution);