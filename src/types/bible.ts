export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface BookData {
  bookName: string;
  chapters: Chapter[];
}

export interface BibleBook {
  name: string;
  abbr: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

export interface SearchResult {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Bookmark {
  id: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  createdAt: number;
}

export interface DictionaryEntry {
  term: string;
  category: 'person' | 'place' | 'event' | 'topic';
  definition: string;
  references: string[];
}

export interface DictionaryCandidateFeatures {
  exactTermMatch: number;
  exactReferencePrior: number;
  contextDefinitionOverlap: number;
  storyContextOverlap: number;
  interactionDefinitionOverlap: number;
  referenceSupport: number;
  bookReferencePrior: number;
  categoryPrior: number;
  queryDefinitionOverlap: number;
}

export interface DictionaryCandidate {
  entry: DictionaryEntry;
  score: number;
  confidence: number;
  features: DictionaryCandidateFeatures;
}

export interface DisambiguationModel {
  version: string;
  trainedAt: string;
  featureWeights: Partial<Record<keyof DictionaryCandidateFeatures, number>>;
  intercept?: number;
  metrics?: {
    samples?: number;
    accuracy?: number;
    loss?: number;
  };
}

export type Translation = 'nasb';

export type ViewMode = 'read' | 'search' | 'bookmarks' | 'dictionary';
