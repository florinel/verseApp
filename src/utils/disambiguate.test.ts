import type { DictionaryEntry } from '../types/bible';
import { describe, expect, it } from 'vitest';
import { rankDictionaryCandidates, scoreDictionaryEntryForQuery } from './disambiguate';

const baseCandidates: DictionaryEntry[] = [
  {
    term: 'Jesus',
    category: 'person',
    definition: 'Jesus of Nazareth from Galilee, teacher and Messiah.',
    references: ['Matthew 1:1', 'Mark 1:1', 'John 1:17'],
  },
  {
    term: 'Jesus',
    category: 'person',
    definition: 'Another Jesus associated with Damascus and later ministry mentions.',
    references: ['Acts 13:6'],
  },
  {
    term: 'David',
    category: 'person',
    definition: 'King of Israel and psalm writer.',
    references: ['1 Samuel 16:1'],
  },
];

describe('disambiguate utils', () => {
  it('prefers exact-term candidates over unrelated entries', () => {
    const ranked = rankDictionaryCandidates({
      term: 'Jesus',
      entries: baseCandidates,
      contextText: 'Jesus went to Galilee.',
      currentBook: 'Matthew',
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].entry.term).toBe('Jesus');
    expect(ranked.every(c => c.entry.term === 'Jesus')).toBe(true);
  });

  it('uses context overlap to rank among same-term candidates', () => {
    const ranked = rankDictionaryCandidates({
      term: 'Jesus',
      entries: baseCandidates,
      contextText: 'Jesus of Nazareth taught in Galilee.',
      currentBook: 'Matthew',
    });

    expect(ranked[0].entry.definition).toContain('Nazareth');
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('returns stable deterministic order for equal scores', () => {
    const sameScore: DictionaryEntry[] = [
      { term: 'John', category: 'person', definition: 'desc one', references: [] },
      { term: 'John', category: 'person', definition: 'desc two', references: [] },
    ];

    const ranked = rankDictionaryCandidates({
      term: 'John',
      entries: sameScore,
      contextText: 'John spoke.',
    });

    expect(ranked.length).toBe(2);
    expect(ranked[0].entry.term).toBe('John');
    expect(ranked[1].entry.term).toBe('John');
  });

  it('scores starts-with term matches higher in query ranking', () => {
    const grace: DictionaryEntry = {
      term: 'Grace',
      category: 'topic',
      definition: 'Unmerited favor of God',
      references: ['Ephesians 2:8'],
    };
    const disgrace: DictionaryEntry = {
      term: 'Disgrace',
      category: 'topic',
      definition: 'State of shame',
      references: [],
    };

    const graceScore = scoreDictionaryEntryForQuery(grace, 'gra');
    const disgraceScore = scoreDictionaryEntryForQuery(disgrace, 'gra');

    expect(graceScore).toBeGreaterThan(disgraceScore);
  });
});
