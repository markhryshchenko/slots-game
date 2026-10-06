import { MathRNG } from "./core/MathRNG.js";
import { SlotMachine } from "./engines/slot/SlotMachine.js";
import { ReelAnalyzer } from "./engines/slot/analysis/ReelAnalyzer.js";
import { MathAnalyzer } from "./engines/slot/analysis/MathAnalyzer.js";

import { rtp96 } from "./games/sevenslice/math/rtp96.js";
import { rtp96LowVolatility } from "./games/sevenslice/math/rtp96LowVolatility.js";
import { rtp96HighVolatility } from "./games/sevenslice/math/rtp96HighVolatility.js";
import { fromCents } from "./core/money.js";
import { MathSimulator } from "./simulation/MathSimulator.js";

const rng = new MathRNG();

const activeProfile = rtp96LowVolatility;

const machine = new SlotMachine(
  activeProfile,
  rng,
);

const result = machine.spin(100);

console.log("Stops:", result.stops);

console.table(result.grid);

console.log(
  "Wins:",
  result.wins.map((win) => ({ ...win, amount: fromCents(win.amount) })),
);

console.log("Total win:", fromCents(result.totalWin));

const simulator = new MathSimulator(machine);

const resSim = simulator.run(
  1_000_000,
  100,
);

console.table(resSim);

const analyzer = new ReelAnalyzer();

const distribution = analyzer.analyze(
  activeProfile.reels[0]?.strip ?? [],
);

console.table(distribution);

const mathAnalyzer = new MathAnalyzer(activeProfile);
const report = mathAnalyzer.analyze();

console.log("\n--- Exact math report ---");
console.log("Total outcomes:", report.totalOutcomes);
console.log("Theoretical RTP:", report.theoreticalRtp);
console.log("Hit rate:", report.hitRate);
console.log("Average win on hit:", report.averageWinOnHit);
console.log("Variance:", report.variance);
console.log("Standard deviation:", report.standardDeviation);
console.log("Max win:", report.maxWin);

console.log("\n--- Monte Carlo vs exact ---");
console.log("Simulated RTP:", resSim.rtp);
console.log("Theoretical RTP:", report.theoreticalRtp);
console.log("Target RTP:", activeProfile.targetRtp);

console.log("\n--- Volatility comparison ---");
console.table(
  [rtp96, rtp96LowVolatility, rtp96HighVolatility].map((profile) => {
    const r = new MathAnalyzer(profile).analyze();
    return {
      profile: r.profileId,
      rtp: r.theoreticalRtp,
      hitRate: r.hitRate,
      stddev: r.standardDeviation,
      volatilityIndex: r.volatilityIndex,
      maxWin: r.maxWin,
    };
  }),
);