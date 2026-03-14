export const DISAMBIGUATION_CONTEXT_WINDOW = 5;
export const DISAMBIGUATION_MAX_REFERENCE_NORM = 10;

export const DISAMBIGUATION_WEIGHTS = {
  exactTermMatch: 0.35,
  contextDefinitionOverlap: 0.3,
  referenceSupport: 0.15,
  bookReferencePrior: 0.1,
  categoryPrior: 0.05,
  queryDefinitionOverlap: 0.05,
} as const;

export const DISAMBIGUATION_CATEGORY_PRIOR = {
  person: 1,
  place: 0.85,
  event: 0.75,
  topic: 0.7,
} as const;

export const DISAMBIGUATION_MIN_CONFIDENCE = 0.15;
