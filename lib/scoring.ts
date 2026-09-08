export type Dimension = 'search'|'ai'|'technicalSeo'|'content'|'authority'|'reputation'|'brand'|'entity'|'social'|'conversion'|'local';
export type ScoreInput = { key: Dimension; value: number; applicable: boolean; confidence: 'high'|'medium'|'low' };
export const SCORING_VERSION = '1.0.0';
export const weights: Record<Dimension, number> = { search:14, ai:10, technicalSeo:14, content:13, authority:10, reputation:7, brand:8, entity:7, social:6, conversion:11, local:10 };

export function calculatePoviraScore(inputs: ScoreInput[]) {
  const applicable = inputs.filter((item) => item.applicable);
  const totalWeight = applicable.reduce((sum, item) => sum + weights[item.key], 0);
  if (!totalWeight) return { value: 0, normalizedWeights: {}, version: SCORING_VERSION };
  const normalizedWeights = Object.fromEntries(applicable.map((item) => [item.key, weights[item.key] / totalWeight]));
  const value = applicable.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.value)) * (weights[item.key] / totalWeight), 0);
  return { value: Math.round(value), normalizedWeights, version: SCORING_VERSION };
}
