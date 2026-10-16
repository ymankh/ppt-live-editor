import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { download } from './assets';
import { exportProject, importProject } from './export';
import { presentationSchema } from './schema';

vi.mock('./assets', async importOriginal => ({
  ...await importOriginal<typeof import('./assets')>(),
  download: vi.fn(),
  fetchAsset: vi.fn(() => Promise.resolve(new Blob(['embedded image'], { type: 'image/png' }))),
}));
vi.mock('./raster', () => ({ rasterizeSlide: vi.fn() }));
vi.mock('./pptx', () => ({ exportPptx: vi.fn() }));
vi.mock('./importPptx', () => ({ importPptx: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('editable project archives', () => {
  it('round trips all element types, notes, theme, links, animations, and embedded images without mutating the source', async () => {
    const project = createPresentation();
    const slide = createSlide();
    const text = createElement('text');
    text.link = { kind: 'slide', slideId: slide.id };
    text.animations = [{ id: 'animation', category: 'entrance', effect: 'fadeIn', trigger: 'onClick', duration: 0.5, delay: 0.2 }];
    slide.elements = [text, createElement('shape'), createElement('line'), createElement('image'), createElement('table'), createElement('chart')];
    slide.notes = 'Speaker notes\nSecond line';
    slide.skipped = true;
    project.slides = [slide];
    const original = structuredClone(project);
    await exportProject(project);
    const call = vi.mocked(download).mock.calls[0];
    if (!call) throw new Error('Project download was not created');
    const [archive, name] = call;
    expect(name).toMatch(/\.pptjson$/);
    const imported = await importProject(new File([archive], name));
    const importedSlide = imported.slides[0];
    const importedImage = importedSlide?.elements.find(element => element.type === 'image');
    expect(importedImage?.assetId).toMatch(/^data:image\/png;base64,/);
    const expected = structuredClone(original);
    const expectedImage = expected.slides[0]?.elements.find(element => element.type === 'image');
    if (!expectedImage || !importedImage) throw new Error('Roundtrip image is missing');
    expectedImage.assetId = importedImage.assetId;
    expect(imported).toEqual(expected);
    expect(project).toEqual(original);
  });

  it('rejects an archive whose referenced image is missing', async () => {
    const project = createPresentation();
    const slide = createSlide();
    slide.elements = [createElement('image')];
    project.slides = [slide];
    const zip = new JSZip();
    zip.file('presentation.json', JSON.stringify(project));
    zip.file('manifest.json', JSON.stringify({ format: 'folio-project', version: 1, assets: {} }));
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(importProject(new File([new Uint8Array(bytes)], 'missing.pptjson'))).rejects.toThrow('Missing embedded asset');
  });

  it('rejects an unsupported manifest version', async () => {
    const zip = new JSZip();
    zip.file('presentation.json', JSON.stringify(createPresentation()));
    zip.file('manifest.json', JSON.stringify({ format: 'folio-project', version: 2, assets: {} }));
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(importProject(new File([new Uint8Array(bytes)], 'future.pptjson'))).rejects.toThrow();
  });

  it('rejects files above the compressed size boundary before decoding', async () => {
    const file = new File([], 'oversized.pptjson');
    Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 });
    await expect(importProject(file)).rejects.toThrow('100 MB');
  });
});

describe('project validator rejection boundaries', () => {
  it('accepts zero opacity and rejects opacity outside the closed interval', () => {
    const project = createPresentation();
    const slide = createSlide();
    const element = createElement('shape');
    slide.elements = [element];
    project.slides = [slide];
    element.opacity = 0;
    expect(presentationSchema.safeParse(project).success).toBe(true);
    element.opacity = 1;
    expect(presentationSchema.safeParse(project).success).toBe(true);
    for (const value of [-0.001, 1.001, Infinity, NaN]) {
      element.opacity = value;
      expect(presentationSchema.safeParse(project).success).toBe(false);
    }
  });

  it('rejects empty slides, duplicate IDs, invalid dimensions, and unsafe links', () => {
    const project = createPresentation();
    const slide = createSlide();
    const element = createElement('text');
    slide.elements = [element];
    project.slides = [slide];
    expect(presentationSchema.safeParse({ ...project, slides: [] }).success).toBe(false);
    expect(presentationSchema.safeParse({ ...project, slides: [slide, slide] }).success).toBe(false);
    expect(presentationSchema.safeParse({ ...project, slideSize: { width: 0, height: 1080 } }).success).toBe(false);
    slide.elements.push(structuredClone(element));
    expect(presentationSchema.safeParse(project).success).toBe(false);
    slide.elements = [element];
    element.link = { kind: 'url', href: 'javascript:alert(1)' };
    expect(presentationSchema.safeParse(project).success).toBe(false);
  });
});
