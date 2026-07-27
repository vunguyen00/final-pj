export function normalizeScoresToTotal(rawScores, targetTotal = 100) {
  if (!Array.isArray(rawScores) || rawScores.length === 0) {
    throw new Error("Test questions must include at least one score.");
  }

  const scores = rawScores.map(Number);
  if (scores.some((score) => !Number.isFinite(score) || score <= 0)) {
    throw new Error("Every question score must be a positive number.");
  }
  if (!Number.isFinite(targetTotal) || targetTotal <= 0) {
    throw new Error("Target score must be a positive number.");
  }

  const sourceTotal = scores.reduce((sum, score) => sum + score, 0);
  const targetCents = Math.round(targetTotal * 100);
  const allocations = scores.map((score, index) => {
    const exactCents = (score / sourceTotal) * targetCents;
    return {
      index,
      cents: Math.floor(exactCents),
      remainder: exactCents - Math.floor(exactCents),
    };
  });
  let centsRemaining =
    targetCents - allocations.reduce((sum, item) => sum + item.cents, 0);

  for (const item of [...allocations].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index,
  )) {
    if (centsRemaining === 0) break;
    item.cents += 1;
    centsRemaining -= 1;
  }

  return allocations
    .sort((left, right) => left.index - right.index)
    .map((item) => item.cents / 100);
}
