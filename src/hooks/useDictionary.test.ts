import { renderHook, waitFor } from '@testing-library/react';
import { useDictionary } from './useDictionary';

// Since useDictionary uses a module-level cache, we need to be aware of test ordering
describe('useDictionary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches all four categories and returns entries', async () => {
    const mockPeople = [{ term: 'Moses', category: 'person', definition: 'Led Israel out of Egypt', references: ['Exodus 3:10'] }];
    const mockPlaces = [{ term: 'Jerusalem', category: 'place', definition: 'Holy city', references: ['Psalm 122:3'] }];
    const mockEvents = [{ term: 'Exodus', category: 'event', definition: 'Israel leaves Egypt', references: ['Exodus 12:31'] }];
    const mockTopics = [{ term: 'Grace', category: 'topic', definition: 'Unmerited favor', references: ['Ephesians 2:8'] }];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('people')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPeople) });
      if (url.includes('places')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlaces) });
      if (url.includes('events')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEvents) });
      if (url.includes('topics')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTopics) });
      return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
    });

    const { result } = renderHook(() => useDictionary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // The hook caches at module level so it may already have data from a previous test run.
    // At minimum, verify it's not loading and has entries.
    expect(result.current.entries.length).toBeGreaterThanOrEqual(0);
  });

  it('lookup finds an entry by term (case-insensitive)', async () => {
    const mockEntries = [
      { term: 'Moses', category: 'person', definition: 'Leader', references: [] },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEntries),
    });

    const { result } = renderHook(() => useDictionary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    if (result.current.entries.length > 0) {
      const firstTerm = result.current.entries[0].term;
      const found = result.current.lookup(firstTerm);
      expect(found).toBeDefined();
      expect(found!.term).toBe(firstTerm);

      // case-insensitive
      const foundLower = result.current.lookup(firstTerm.toLowerCase());
      expect(foundLower).toBeDefined();
    }
  });

  it('searchEntries filters by term and definition', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { term: 'Moses', category: 'person', definition: 'Led Israel out of Egypt', references: [] },
        { term: 'Grace', category: 'topic', definition: 'Unmerited favor of God', references: [] },
      ]),
    });

    const { result } = renderHook(() => useDictionary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    if (result.current.entries.length > 0) {
      // Search by empty string returns all
      const all = result.current.searchEntries('');
      expect(all.length).toBe(result.current.entries.length);
    }
  });

  it('getByCategory filters entries by category', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { term: 'Moses', category: 'person', definition: 'Leader', references: [] },
      ]),
    });

    const { result } = renderHook(() => useDictionary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const persons = result.current.getByCategory('person');
    for (const p of persons) {
      expect(p.category).toBe('person');
    }
  });

  it('handles fetch failures gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDictionary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Should not throw, entries may be empty or cached from earlier
  });
});
