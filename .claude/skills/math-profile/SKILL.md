---
name: math-profile
description: Create or tune a slot math profile (reel strips and paytable) for a target RTP and volatility, then prove it with the exact MathAnalyzer and a Monte Carlo cross-check. Use when the user asks for a new RTP version (96/94/92), a different volatility, changed multipliers or strips, or asks why a profile pays what it pays.
---

# Math profile

A math profile (`MathConfig<GameSymbol>` in `apps/server/src/games/<gameId>/math/<profile>.ts`) is a **certified artifact**. Never change a live profile silently: create a new file with a new `id` and point the game config at it only after verification and the user's agreement.

## Facts to rely on

- **RTP** is the expected return per unit bet. It is set only by the reel strips and the paytable.
- **The number of paylines does not change RTP.** The line bet is `total / N` and expectations add up, so `N` cancels out. Lines change hit rate and spread.
- **Hit rate** is set by the strips: how often matching symbols line up.
- **Volatility at a fixed RTP** is set by the paytable: move the RTP "budget" from frequent symbols to rare ones and volatility grows.
- **Volatility index** = stddev / RTP. Bands: < 2 low, 2–4 medium, > 4 high (industry rule of thumb, not a standard).

## Steps

1. **Read the strips.** Get symbol probabilities per reel from `ReelAnalyzer`; `analyze.ts` prints them.
2. **Estimate in closed form**, valid only for line pays of 3-of-a-kind without wild or scatter:

   ```text
   RTP = Σ over symbols ( p_reel1 × p_reel2 × p_reel3 × multiplier )
   ```

   With any other mechanic (wild, scatter, ways, cascades) skip the formula and use only the analyzer.
3. **Split the RTP budget** between symbols to get the wanted volatility: frequent symbols with small multipliers for low volatility, rare ones with big multipliers for high.
4. **Fine-tune** with the symbol whose combination probability is smallest. In Seven Slice, `+1` to the WATERMELON or SEVEN multiplier moves RTP by exactly 0.001.
5. **Verify:**

   ```bash
   npx tsx .claude/skills/math-profile/analyze.ts apps/server/src/games/<gameId>/math/<profile>.ts <exportName> [spins]
   ```

   It prints the exact report (RTP, hit rate, stddev, volatility index with its band, max win, symbol probabilities) and a Monte Carlo run. The simulated RTP must stay within 3σ/√N of the exact value. A warning that repeats means a bug in the engine or the profile.
6. **Report** to the user: target vs exact RTP, hit rate, stddev, volatility index and band, max win per spin at a $1 bet, and the Monte Carlo deviation. Recommend; do not switch the live game without agreement.
7. If the profile becomes the active one, update the reference numbers in `.claude/skills/verify/smoke.sh` in the same change and run the `verify` skill.

## Reference: current Seven Slice profiles

| Profile | CHERRY / LEMON / PLUM / WATERMELON / SEVEN | RTP | Hit rate | Volatility index | Max win |
|---|---|---|---|---|---|
| `rtp-96` | 6 / 12 / 25 / 75 / 200 | 0.961 | 0.297 | 3.43 | 40 |
| `rtp-96-low-volatility` (active) | 14 / 14 / 20 / 22 / 22 | 0.960 | 0.297 | 1.68 | 11.2 |
| `rtp-96-high-volatility` | 1 / 1 / 2 / 5 / 885 | 0.960 | 0.297 | 13.0 | 177 |

Symbol probability on every reel: CHERRY 0.3, LEMON 0.3, PLUM 0.2, WATERMELON 0.1, SEVEN 0.1. The probability of 3-of-a-kind is the cube of that.
