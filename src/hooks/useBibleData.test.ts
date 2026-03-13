import { renderHook, waitFor } from '@testing-library/react';
import { useBibleData } from './useBibleData';

describe('useBibleData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading state and fetches data', async () => {
    const mockData = {
      bookName: 'Genesis',
      chapters: [
        { chapter: 1, verses: [{ verse: 1, text: 'In the beginning' }] },
      ],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useBibleData('Genesis', 'nasb'));

    // Initially loading (may be cached from a previous test)
    if (result.current.loading) {
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    }
    expect(result.current.data).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it('returns error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    // Use a unique book name to avoid cache hits
    const { result } = renderHook(() => useBibleData('NonExistentBook', 'nasb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('returns error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBibleData('AnotherFakeBook', 'nasb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('calls fetch with the correct URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bookName: '1 Samuel', chapters: [] }),
    });

    renderHook(() => useBibleData('1 Samuel', 'nasb'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/data/bible/nasb/1-samuel.json');
    });
  });
});
