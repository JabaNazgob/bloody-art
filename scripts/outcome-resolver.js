import { OUTCOMES } from "./constants.js";

function contributionCausedMiss(contribution, attackTotal, targetAC) {
  return Boolean(
    contribution?.reliable
    && Number.isFinite(attackTotal)
    && Number.isFinite(targetAC)
    && Number.isFinite(contribution.without)
    && attackTotal >= contribution.without
    && attackTotal < targetAC
  );
}

export function calculateMissWeights({ dexterity = 10, missMargin = 1, canParry = false } = {}) {
  const dex = Math.max(1, Number(dexterity) || 10);
  const margin = Math.max(1, Number(missMargin) || 1);
  const closeMiss = Math.max(0, 6 - margin);
  return {
    PARRY: canParry ? 25 + (closeMiss * 8) : 0,
    DODGE: 20 + (Math.max(0, dex - 10) * 2) + (closeMiss * 6),
    CLEAN_MISS: 8 + (margin * 10)
  };
}

export function selectWeightedOutcome(weights, rng = Math.random) {
  const entries = Object.entries(weights).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total) return OUTCOMES.CLEAN_MISS;
  let cursor = Math.min(0.999999999, Math.max(0, Number(rng()) || 0)) * total;
  for (const [outcome, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return outcome;
  }
  return entries.at(-1)[0];
}

export function resolveOutcome({
  isHit = false,
  isObject = false,
  attackTotal = 0,
  targetAC = 0,
  acContributions = null,
  dexterity = 10,
  canParry = false,
  rng = Math.random
} = {}) {
  if (isHit) return { outcome: OUTCOMES.HIT, weights: null };
  if (isObject) return { outcome: OUTCOMES.OBJECT_BLOCK, weights: null };
  if (contributionCausedMiss(acContributions?.shield, attackTotal, targetAC)) {
    return { outcome: OUTCOMES.SHIELD_BLOCK, weights: null };
  }
  if (contributionCausedMiss(acContributions?.armor, attackTotal, targetAC)) {
    return { outcome: OUTCOMES.ARMOR_DEFLECT, weights: null };
  }

  const weights = calculateMissWeights({
    dexterity,
    missMargin: Math.max(1, targetAC - attackTotal),
    canParry
  });
  return { outcome: selectWeightedOutcome(weights, rng), weights };
}
