import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch } from './useSearch';

describe('useSearch — parseReference logic (via search)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(chapterData: object) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(chapterData),
    });
  }

  it('starts with empty state', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.query).toBe('');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.dictResults).toHaveLength(0);
    expect(result.current.searching).toBe(false);
    expect(result.current.refMatch).toBeNull();
  });

  it('ignores queries shorter than 2 characters', async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('a');
    });
    expect(result.current.results).toHaveLength(0);
    expect(result.current.query).toBe('a');
  });

  it('ignores empty query', async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('');
    });
    expect(result.current.results).toHaveLength(0);
    expect(result.current.query).toBe('');
  });

  it('parses a full reference "John 3:16"', async () => {
    mockFetch({
      chapters: [
        { chapter: 3, verses: [{ verse: 16, text: 'For God so loved the world' }] },
      ],
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('John 3:16');
    });
    expect(result.current.refMatch).toEqual({ bookName: 'John', chapter: 3, verse: 16 });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].text).toBe('For God so loved the world');
  });

  it('parses a chapter-only reference "Genesis 1"', async () => {
    mockFetch({
      chapters: [
        {
          chapter: 1,
          verses: [
            { verse: 1, text: 'In the beginning' },
            { verse: 2, text: 'The earth was formless' },
          ],
        },
      ],
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('Genesis 1');
    });
    expect(result.current.refMatch).toEqual({ bookName: 'Genesis', chapter: 1, verse: undefined });
    expect(result.current.results).toHaveLength(2);
  });

  it('parses a reference using book abbreviation "Gen 1:1"', async () => {
    mockFetch({
      chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'In the beginning' }] }],
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('Gen 1:1');
    });
    expect(result.current.refMatch?.bookName).toBe('Genesis');
    expect(result.current.results).toHaveLength(1);
  });

  it('parses a numbered-book reference "1 John 1:1"', async () => {
    mockFetch({
      chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'What was from the beginning' }] }],
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('1 John 1:1');
    });
    expect(result.current.refMatch?.bookName).toBe('1 John');
    expect(result.current.results).toHaveLength(1);
  });

  it('does not parse an invalid reference (chapter out of range)', async () => {
    // Genesis only has 50 chapters, so chapter 999 is invalid
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('Genesis 999');
    });
    expect(result.current.refMatch).toBeNull();
  });

  it('does not parse an unknown book name', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('Fakebook 1:1');
    });
    expect(result.current.refMatch).toBeNull();
  });

  it('keyword search returns matching verses (case-insensitive)', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      // First 4 calls are dictionary fetches
      if (callCount <= 4) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      // First book fetch has a match
      if (callCount === 5) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'Grace and peace be multiplied' }] }],
          }),
        });
      }
      // Rest return no matches
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'no match here' }] }],
        }),
      });
    });

    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('grace');
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(false);
    }, { timeout: 15000 });

    expect(result.current.refMatch).toBeNull();
    expect(result.current.results.length).toBeGreaterThanOrEqual(1);
    expect(result.current.results[0].text).toMatch(/Grace/i);
  });

  it('dictionary search populates dictResults', async () => {
    const mockDict = [
      { term: 'Grace', category: 'topic', definition: 'Unmerited favor', references: [] },
    ];
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 4) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDict) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'no match' }] }] }),
      });
    });

    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('grace');
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(false);
    }, { timeout: 15000 });

    expect(result.current.dictResults.length).toBeGreaterThanOrEqual(1);
  });

  it('clear resets all state', async () => {
    mockFetch({
      chapters: [{ chapter: 3, verses: [{ verse: 16, text: 'For God so loved the world' }] }],
    });
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('John 3:16');
    });
    expect(result.current.query).toBe('John 3:16');

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.dictResults).toHaveLength(0);
    expect(result.current.refMatch).toBeNull();
    expect(result.current.searching).toBe(false);
  });

  it('handles fetch failure gracefully during reference search', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.search('John 3:16');
    });
    // Should not throw — refMatch is set but results may be empty
    expect(result.current.refMatch?.bookName).toBe('John');
    expect(result.current.searching).toBe(false);
  });
});
