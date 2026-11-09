import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { ApiError } from '@/lib/api';
import { useEditor } from '@/store/editor';
import { arabic } from '@/features/localization/ar';
import { useLocale } from '@/features/localization/locale';
import { getProject } from '@/features/persistence/repository';
import { useFontRegistry } from './registry';
import { PresentationFontGate } from './PresentationFontGate';

const mocks = vi.hoisted(() => ({ available: new Set<string>(), initialize: vi.fn<() => Promise<void>>(), upload: vi.fn<(file: File, family: string) => Promise<void>>() }));
vi.mock('@/features/persistence/repository', () => ({ getProject: vi.fn(), getLastProject: vi.fn(), saveProject: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./registry', async () => {
  // Vitest hoists this mock factory before static imports; create the reactive test store inside that boundary.
  const { create } = await import('zustand');
  return {
    useFontRegistry: create(() => ({ fonts: [] as { id: string; family: string }[], ready: false, error: null as string | null, initialize: () => mocks.initialize(), uploadFont: (file: File, family: string) => mocks.upload(file, family) })),
    useAvailableFontFamilies: () => ['Geist', 'Folio Arabic'],
    isFontAvailable: (family: string) => mocks.available.has(family),
  };
});

function openFixture(fontFamily = 'Missing Family') {
  const document = createPresentation();
  const text = createElement('text');
  text.fontFamily = fontFamily;
  document.slides = [{ ...createSlide(), elements: [text] }];
  useEditor.getState().setDocument(document);
  return document;
}

function renderGate(id: string) {
  return render(<MemoryRouter initialEntries={[`/edit/${id}`]}><Routes>
    <Route path="/edit/:projectId" element={<PresentationFontGate><div data-testid="editor">Editor contents</div></PresentationFontGate>} />
    <Route path="/projects" element={<h1>Presentation library</h1>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.available.clear();
  mocks.available.add('Geist');
  mocks.available.add('Folio Arabic');
  useLocale.getState().setLocale('en');
  useFontRegistry.setState({ fonts: [], ready: false, error: null });
  mocks.initialize.mockImplementation(() => { useFontRegistry.setState({ ready: true }); return Promise.resolve(); });
  mocks.upload.mockImplementation((_file: File, family: string) => {
    mocks.available.add(family);
    useFontRegistry.setState({ fonts: [{ id: 'uploaded', family }] });
    return Promise.resolve();
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('blocking presentation font resolution', () => {
  it('waits for persisted font initialization before scanning or rendering the editor', async () => {
    const document = openFixture('Uploaded Family');
    let finish: (() => void) | undefined;
    mocks.initialize.mockImplementation(() => new Promise<void>(resolve => {
      finish = () => { mocks.available.add('Uploaded Family'); useFontRegistry.setState({ ready: true }); resolve(); };
    }));
    renderGate(document.id);
    expect(screen.queryByTestId('editor')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading presentation and fonts…');
    await act(() => { finish?.(); return Promise.resolve(); });
    expect(await screen.findByTestId('editor')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('requires an explicit available replacement and applies it only on approval', async () => {
    const document = openFixture();
    renderGate(document.id);
    const dialog = await screen.findByRole('dialog', { name: 'Resolve missing fonts' });
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.queryByTestId('editor')).toBeNull();
    const apply = screen.getByRole('button', { name: 'Apply and continue' });
    expect(apply.hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Replace with' }), { target: { value: 'Geist' } });
    expect(useEditor.getState().document.slides[0]?.elements[0]).toMatchObject({ fontFamily: 'Missing Family' });
    fireEvent.click(apply);
    expect(await screen.findByTestId('editor')).toBeTruthy();
    expect(useEditor.getState().document.slides[0]?.elements[0]).toMatchObject({ fontFamily: 'Geist' });
  });

  it('binds uploads to the missing family and keeps that family unchanged on the presentation', async () => {
    const document = openFixture();
    renderGate(document.id);
    await screen.findByRole('dialog');
    const file = new File(['font bytes'], 'family.woff2');
    fireEvent.change(screen.getByLabelText('Upload font: Missing Family'), { target: { files: [file] } });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file, 'Missing Family'));
    await screen.findByText('Font uploaded and ready');
    fireEvent.click(screen.getByRole('button', { name: 'Apply and continue' }));
    expect(await screen.findByTestId('editor')).toBeTruthy();
    expect(useEditor.getState().document.slides[0]?.elements[0]).toMatchObject({ fontFamily: 'Missing Family' });
  });

  it('provides an explicit safe return to the library without applying pending selections', async () => {
    const document = openFixture();
    const original = structuredClone(useEditor.getState().document);
    renderGate(document.id);
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('combobox', { name: 'Replace with' }), { target: { value: 'Geist' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back to library' }));
    expect(await screen.findByRole('heading', { name: 'Presentation library' })).toBeTruthy();
    expect(useEditor.getState().document).toEqual(original);
  });

  it('does not rescan during font-name typing, but scans again when the same document is reopened', async () => {
    const document = openFixture('Geist');
    renderGate(document.id);
    await screen.findByTestId('editor');
    act(() => useEditor.getState().mutate('Edit font', draft => {
      const text = draft.slides[0]?.elements[0];
      if (text?.type === 'text') text.fontFamily = 'Typing a font';
    }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useEditor.getState().setDocument(structuredClone(useEditor.getState().document)));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Typing a font')).toBeTruthy();
  });

  it('shows initialization failures and retries instead of silently rendering fallback fonts', async () => {
    const document = openFixture('Geist');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.initialize.mockRejectedValueOnce(new Error('Font service unavailable'));
    renderGate(document.id);
    expect((await screen.findByRole('alert')).textContent).toBe("We couldn't load the fonts for this presentation. Please try again.");
    expect(screen.queryByTestId('editor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('editor')).toBeTruthy();
  });

  it('explains server failures in plain, translated language without status codes or URLs', async () => {
    const document = openFixture('Geist');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.initialize.mockRejectedValueOnce(new ApiError('Folio API request failed (GET /api/fonts, HTTP 404): Not Found', 404, 'Not Found'));
    const { unmount } = renderGate(document.id);
    expect((await screen.findByRole('alert')).textContent).toBe("We couldn't load the fonts for this presentation. Please try again.");
    unmount();

    useLocale.getState().setLocale('ar');
    mocks.initialize.mockRejectedValueOnce(new ApiError('Cannot reach the Folio API (GET /api/fonts): Failed to fetch', undefined, undefined));
    renderGate(document.id);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(arabic["Can't connect to Folio. Check your internet connection and try again."]);
    expect(alert.textContent).not.toMatch(/HTTP|\/api|Folio API/);
  });

  it('names the presentation as what failed once fonts are ready', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(getProject).mockRejectedValueOnce(new ApiError('Folio API request failed (GET /api/projects/x, HTTP 400): Bad Request', 400, 'Bad Request'));
    renderGate('not-open');
    expect((await screen.findByRole('alert')).textContent).toBe("We couldn't open this presentation. Please try again.");
    vi.mocked(getProject).mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe("This presentation couldn't be found. It may have been deleted."));
  });

  it('preserves the active unsaved document and does not reload fonts when changing locale', async () => {
    const document = openFixture('Geist');
    renderGate(document.id);
    await screen.findByTestId('editor');
    act(() => useEditor.getState().mutate('Rename', draft => { draft.title = 'Unsaved title'; }));
    const snapshot = useEditor.getState().document;
    act(() => useLocale.getState().setLocale('ar'));
    expect(useEditor.getState().document).toBe(snapshot);
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('editor')).toBeTruthy();
  });
});
