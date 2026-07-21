import type { ScoringWeights } from '../types'

export const DEFAULT_WEIGHTS: ScoringWeights = {
  rivalry: 30,
  stakes: 25,
  quality: 15,
  marquee: 10,
  scarcity: 10,
  favorite: 10,
}

export const DEFAULT_MUST_SEE_THRESHOLD = 70
export const DEFAULT_CROWDED_THRESHOLD = 3
