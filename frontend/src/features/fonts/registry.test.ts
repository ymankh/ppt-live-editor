import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { isFontAvailable, useFontRegistry } from './registry';

const bytes = new Uint8Array([0, 1, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer;
interface FakeFontFace { family: string; status: string }
let faces: FakeFontFace[];
let addFace: Mock;
let loadFace: Mock;
let fetchMock: Mock;

function fontFile(name = 'custom.ttf', size?: number): File {
  const file = new File([bytes], name);
  Object.defineProperty(file, 'arrayBuffer', { value: vi.fn().mockResolvedValue(bytes) });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  useFontRegistry.setState({ fonts: [], ready: false, error: null });
  faces = [];
  addFace = vi.fn((face: FakeFontFace) => { faces.push(face); });
  loadFace = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('FontFace', class {
    family: string;
    status = 'unloaded';
    constructor(family: string) { this.family = family; }
    async load() { await loadFace(); this.status = 'loaded'; return this; }
  });
  const context = {
    font: '',
    measureText() {
      if (this.font.includes('"Arial"')) return { width: 150 };
      const fallback = this.font.split(',').at(-1)?.trim();
      return { width: fallback?.endsWith('monospace') ? 100 : fallback?.endsWith('sans-serif') ? 120 : 110 };
    },
  };
  vi.stubGlobal('document', {
    fonts: { add: addFace, forEach: (callback: (face: { family: string; status: string }) => void) => faces.forEach(callback), load: vi.fn().mockResolvedValue([]), check: vi.fn().mockReturnValue(true) },
    createElement: vi.fn().mockReturnValue({ getContext: () => context }),
  });
  fetchMock = vi.fn().mockResolvedValue(new Response('[]'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('font registry', () => {
  it('shares initialization and loads persisted bytes before reporting ready', async () => {
    let release!: () => void;
    loadFace.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    fetchMock.mockImplementation((url: string) => Promise.resolve(url === '/api/fonts'
      ? new Response(JSON.stringify([{ id: 'saved/font', family: 'Saved Family' }]))
      : new Response(bytes)));
    const first = useFontRegistry.getState().initialize();
    const second = useFontRegistry.getState().initialize();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(loadFace).toHaveBeenCalledOnce());
    expect(useFontRegistry.getState().ready).toBe(false);
    expect(addFace).not.toHaveBeenCalled();
    release();
    await first;
    expect(fetchMock).toHaveBeenCalledWith('/api/fonts/saved%2Ffont/content', undefined);
    expect(useFontRegistry.getState().fonts).toEqual([{ id: 'saved/font', family: 'Saved Family' }]);
    expect(useFontRegistry.getState().ready).toBe(true);
    expect(isFontAvailable('Saved Family')).toBe(true);
    await useFontRegistry.getState().initialize();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('validates real font bytes before upload and preserves the explicit family name', async () => {
    await useFontRegistry.getState().initialize();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      expect(loadFace).toHaveBeenCalledOnce();
      expect(addFace).not.toHaveBeenCalled();
      expect(init?.body).toBe(bytes);
      return Promise.resolve(new Response(JSON.stringify({ id: 'font-1', family: 'خط عربي' }), { status: 201 }));
    });
    await useFontRegistry.getState().uploadFont(fontFile('arabic.woff2'), '  خط عربي  ');
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/fonts?family=${encodeURIComponent('خط عربي')}`, expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/octet-stream' } }));
    expect(useFontRegistry.getState().fonts).toEqual([{ id: 'font-1', family: 'خط عربي' }]);
    expect(faces[0]?.family).toBe('"خط عربي"');
    expect(useFontRegistry.getState().error).toBeNull();
  });

  it('never persists invalid fonts or registers a font whose persistence failed', async () => {
    await useFontRegistry.getState().initialize();
    loadFace.mockRejectedValueOnce(new Error('Invalid sfnt'));
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'Custom')).rejects.toThrow('browser could not load');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(addFace).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Disk unavailable' }), { status: 503 }));
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'Custom')).rejects.toThrow('Disk unavailable');
    expect(addFace).not.toHaveBeenCalled();
    expect(useFontRegistry.getState().fonts).toEqual([]);
  });

  it('rejects unsupported, empty, oversized, ambiguous, and duplicate uploads', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 'existing', family: 'Custom' }])));
    await expect(useFontRegistry.getState().uploadFont(fontFile('font.svg'), 'Custom')).rejects.toThrow('TTF, OTF, WOFF');
    await expect(useFontRegistry.getState().uploadFont(fontFile('font.ttf', 0), 'Custom')).rejects.toThrow('empty');
    await expect(useFontRegistry.getState().uploadFont(fontFile('font.ttf', 20 * 1024 * 1024 + 1), 'Custom')).rejects.toThrow('20 MiB');
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'One, Two')).rejects.toThrow('family name');
    fetchMock.mockImplementation((url: string) => Promise.resolve(url === '/api/fonts'
      ? new Response(JSON.stringify([{ id: 'existing', family: 'Custom' }])) : new Response(bytes)));
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'custom')).rejects.toThrow('already uploaded');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces initialization failures and permits a real retry without becoming ready', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Library unavailable' }), { status: 503 }));
    await expect(useFontRegistry.getState().initialize()).rejects.toThrow('Library unavailable');
    expect(useFontRegistry.getState().ready).toBe(false);
    expect(useFontRegistry.getState().error).toBe('Something went wrong on our side. Please try again in a moment.');
    await useFontRegistry.getState().initialize();
    expect(useFontRegistry.getState().ready).toBe(true);
    expect(useFontRegistry.getState().error).toBeNull();
  });

  it('reports a missing font library route as a friendly message, not the HTTP status', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Not Found', status: 404 }), { status: 404 }));
    await expect(useFontRegistry.getState().initialize()).rejects.toThrow('HTTP 404');
    expect(useFontRegistry.getState().error).toBe("We couldn't load your fonts. Please try again.");
  });

  it('keeps upload rules the server re-checks and hides other server wording', async () => {
    await useFontRegistry.getState().initialize();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'A font with this family name is already uploaded.' }), { status: 409 }));
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'Custom')).rejects.toThrow('HTTP 409');
    expect(useFontRegistry.getState().error).toBe('A font with this family name is already uploaded.');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'One or more validation errors occurred.' }), { status: 400 }));
    await expect(useFontRegistry.getState().uploadFont(fontFile(), 'Custom')).rejects.toThrow('HTTP 400');
    expect(useFontRegistry.getState().error).toBe("We couldn't upload this font. Please try again.");
  });

  it('detects actual system and loaded fonts without trusting FontFaceSet.check', () => {
    expect(isFontAvailable('Definitely Missing Family')).toBe(false);
    expect(isFontAvailable('Arial')).toBe(true);
    expect(isFontAvailable('sans-serif')).toBe(true);
    expect(isFontAvailable('')).toBe(false);
    faces.push({ family: '"Geist Variable"', status: 'loaded' }, { family: '"Uploaded"', status: 'loaded' }, { family: '"Unloaded"', status: 'unloaded' });
    expect(isFontAvailable('Geist')).toBe(true);
    expect(isFontAvailable('Uploaded')).toBe(true);
    expect(isFontAvailable('Unloaded')).toBe(false);
    expect(isFontAvailable('"Definitely Missing Family", Arial')).toBe(true);
  });
});
