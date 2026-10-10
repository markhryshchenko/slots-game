export function generateStopCombinations(
  reelSizes: readonly number[],
): number[][] {
  let combinations: number[][] = [[]];

  for (const size of reelSizes) {
    const next: number[][] = [];

    for (const combo of combinations) {
      for (let stop = 0; stop < size; stop++) {
        next.push([...combo, stop]);
      }
    }

    combinations = next;
  }

  return combinations;
}
