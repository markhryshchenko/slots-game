// Prints the exact math report and a Monte Carlo cross-check for one profile.
// Usage: npx tsx .claude/skills/math-profile/analyze.ts <profile-module.ts> <exportName> [spins]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { MathConfig } from "../../../apps/server/src/engines/slot/MathConfig.js";
import { MathAnalyzer } from "../../../apps/server/src/engines/slot/analysis/MathAnalyzer.js";
import { SlotMachine } from "../../../apps/server/src/engines/slot/SlotMachine.js";
import { MathRNG } from "../../../apps/server/src/core/MathRNG.js";
import { MathSimulator } from "../../../apps/server/src/simulation/MathSimulator.js";

const [modulePath, exportName, spinsArg] = process.argv.slice(2);

if (!modulePath || !exportName) {
  console.error(
    "Usage: npx tsx .claude/skills/math-profile/analyze.ts <profile-module.ts> <exportName> [spins=1000000]",
  );
  process.exit(1);
}

const loaded: Record<string, unknown> = await import(pathToFileURL(resolve(modulePath)).href);
const profile = loaded[exportName] as MathConfig | undefined;

if (!profile || !Array.isArray(profile.reels)) {
  console.error(`Export "${exportName}" in ${modulePath} is not a MathConfig`);
  process.exit(1);
}

const spins = Number(spinsArg ?? 1_000_000);
const report = new MathAnalyzer(profile).analyze();
const simulation = new MathSimulator(new SlotMachine(profile, new MathRNG())).run(spins, 100);

// Expected spread of the Monte Carlo RTP around the exact value.
const tolerance = (3 * report.standardDeviation) / Math.sqrt(spins);
const deviation = Math.abs(simulation.rtp - report.theoreticalRtp);

const volatilityBand =
  report.volatilityIndex < 2 ? "low" : report.volatilityIndex <= 4 ? "medium" : "high";

console.log(`\nProfile ${report.profileId} (target RTP ${profile.targetRtp})`);
console.table({
  "theoretical RTP": report.theoreticalRtp,
  "hit rate": report.hitRate,
  "average win on hit": report.averageWinOnHit,
  "std deviation": report.standardDeviation,
  [`volatility index (${volatilityBand})`]: report.volatilityIndex,
  "max win per spin, $1 bet": report.maxWin,
  "total outcomes": report.totalOutcomes,
});

console.log("Symbol probabilities per reel:");
for (const reel of report.symbolProbabilities) {
  const line = reel.probabilities.map((p) => `${p.symbol} ${p.probability}`).join(", ");
  console.log(`  reel ${reel.reelId}: ${line}`);
}

console.log(`\nMonte Carlo, ${spins.toLocaleString("en-US")} spins:`);
console.log(`  simulated RTP ${simulation.rtp}, deviation ${deviation.toFixed(6)}, 3σ/√N ${tolerance.toFixed(6)}`);
console.log(
  deviation <= tolerance
    ? "  OK: simulation agrees with the exact value"
    : "  WARNING: deviation above 3σ/√N — rerun; if it repeats, the engine or the profile is wrong",
);

const offTarget = Math.abs(report.theoreticalRtp - profile.targetRtp);
if (offTarget > 0.001) {
  console.log(`\nNOTE: theoretical RTP is ${offTarget.toFixed(4)} away from targetRtp ${profile.targetRtp}`);
}
