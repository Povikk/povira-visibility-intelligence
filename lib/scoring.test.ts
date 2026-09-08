import { describe, expect, it } from 'vitest';
import { calculatePoviraScore } from './scoring';
describe('Povira Score', () => {
  it('normalise les poids sur les seules dimensions applicables', () => { const result = calculatePoviraScore([{ key:'technicalSeo', value:80, applicable:true, confidence:'high' },{ key:'local', value:0, applicable:false, confidence:'high' },{ key:'conversion', value:60, applicable:true, confidence:'medium' }]); expect(result.value).toBe(71); expect(result.normalizedWeights).not.toHaveProperty('local'); });
  it('borne les valeurs entre 0 et 100', () => { expect(calculatePoviraScore([{ key:'search', value:140, applicable:true, confidence:'high' }]).value).toBe(100); });
});
