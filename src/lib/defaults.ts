import { nanoid } from 'nanoid';
import { textDocument, type ElementBase, type ElementOf, type ElementType, type Presentation, type ShapeKind, type Slide, type SlideElement, type TextElement, type Theme } from '../types/model';

const defaultTheme: Theme = { id: 'studio', name: 'Studio', colors: { background: '#fffaf5', text: '#292825', primary: '#ed7355', secondary: '#f7e8dc', accent: ['#ed7355', '#b8c4aa', '#e5bd80', '#8c9aaf'] }, fonts: { heading: 'Geist', body: 'Geist' } };
export const themes: Theme[] = [
  defaultTheme,
  { id: 'midnight', name: 'Midnight', colors: { background: '#182334', text: '#f5f7fb', primary: '#a7baf7', secondary: '#2c3b52', accent: ['#a7baf7', '#72d2c4', '#efbe7d', '#ec99c1'] }, fonts: { heading: 'Geist', body: 'Geist' } },
  { id: 'sage', name: 'Sage', colors: { background: '#f4f6ee', text: '#29392e', primary: '#71856a', secondary: '#dce4d4', accent: ['#71856a', '#d5a66b', '#b8c2a9', '#7eaaa0'] }, fonts: { heading: 'Geist', body: 'Geist' } },
  { id: 'ocean', name: 'Ocean', colors: { background: '#f1f7fa', text: '#173348', primary: '#3e8fa8', secondary: '#d6eaf0', accent: ['#3e8fa8', '#f0b27a', '#729bc1', '#9ac7b5'] }, fonts: { heading: 'Geist', body: 'Geist' } },
  { id: 'plum', name: 'Plum', colors: { background: '#faf5fa', text: '#39293e', primary: '#9264a1', secondary: '#eddfef', accent: ['#9264a1', '#d98eaf', '#baa76d', '#85a7ad'] }, fonts: { heading: 'Geist', body: 'Geist' } },
  { id: 'mono', name: 'Monochrome', colors: { background: '#ffffff', text: '#202020', primary: '#333333', secondary: '#eeeeee', accent: ['#333333', '#777777', '#aaaaaa', '#dddddd'] }, fonts: { heading: 'Geist', body: 'Geist' } },
];
export const layouts = [
  { id: 'title', name: 'Title slide' }, { id: 'title-content', name: 'Title & content' },
  { id: 'section', name: 'Section header' }, { id: 'two-column', name: 'Two columns' },
  { id: 'image-right', name: 'Image & text' }, { id: 'full-image', name: 'Full image' },
  { id: 'comparison', name: 'Comparison' }, { id: 'blank', name: 'Blank' },
];
export const coverImage = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85';
const base = (name: string): ElementBase => ({ id: nanoid(), name, x: 640, y: 380, width: 640, height: 320, rotation: 0, opacity: 1, locked: false, hidden: false, animations: [] });

export function createElement<T extends ElementType>(type: T, shape?: ShapeKind): ElementOf<T>;
export function createElement(type: ElementType, shape: ShapeKind = 'rect'): SlideElement {
  switch (type) {
    case 'text': return { ...base('Text'), type, width: 760, height: 120, content: textDocument('Your text here'), verticalAlign: 'top', autoFit: 'none', padding: 0, fill: { type: 'none' }, stroke: null, shadow: null, cornerRadius: 0, fontSize: 64, fontFamily: 'Geist', color: '#292825', bold: false, italic: false, align: 'left', letterSpacing: 0 };
    case 'shape': return { ...base('Shape'), type, shape, fill: { type: 'solid', color: '#ed7355' }, stroke: null, shadow: null, cornerRadius: shape === 'roundRect' ? 32 : 0, flipH: false, flipV: false, text: null, textVerticalAlign: 'middle' };
    case 'line': return { ...base('Line'), type, width: 640, height: 0, start: { x: 0, y: 0 }, end: { x: 640, y: 0 }, curve: 'straight', stroke: { color: '#292825', width: 4, style: 'solid' }, startArrow: 'none', endArrow: 'none' };
    case 'image': return { ...base('Image'), type, assetId: coverImage, naturalWidth: 1400, naturalHeight: 1000, crop: { x: 0, y: 0, width: 1, height: 1 }, filters: { brightness: 1, contrast: 1, saturation: 1, blur: 0, grayscale: 0 }, flipH: false, flipV: false, stroke: null, shadow: null, cornerRadius: 24, clipShape: 'roundRect' };
    case 'table': return { ...base('Table'), type, width: 900, height: 360, rows: Array.from({ length: 4 }, (_, row) => ({ id: nanoid(), height: 90, cells: (row === 0 ? ['Initiative', 'Owner', 'Status'] : ['New initiative', 'Team', 'In progress']).map(value => ({ id: nanoid(), content: textDocument(value), fill: { type: 'solid' as const, color: row === 0 ? '#f7e8dc' : '#ffffff' }, colSpan: 1, rowSpan: 1 })) })), columnWidths: [300, 300, 300], style: { headerRow: true, bandedRows: true, borderColor: '#dedbd5', borderWidth: 1, headerFill: { type: 'solid', color: '#f7e8dc' } } };
    case 'chart': return { ...base('Chart'), type, width: 1000, height: 600, chart: 'bar', categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ id: nanoid(), name: 'Growth', color: '#ed7355', values: [24, 38, 56, 82] }, { id: nanoid(), name: 'Target', color: '#b8c4aa', values: [30, 42, 60, 90] }], options: { showLegend: true, showGrid: true, showValues: false, stacked: false, title: 'Quarterly growth' } };
  }
}

const text = (value: string, x: number, y: number, width: number, height: number, size = 48, extras: Partial<TextElement> = {}): TextElement => ({ ...createElement('text'), name: value.split('\n')[0] ?? '', content: textDocument(value), x, y, width, height, fontSize: size, ...extras });
const box = (x: number, y: number, width: number, height: number, color: string, radius = 0): SlideElement => ({ ...createElement('shape', radius ? 'roundRect' : 'rect'), x, y, width, height, fill: { type: 'solid', color }, cornerRadius: radius });
const photo = (x: number, y: number, width: number, height: number): SlideElement => ({ ...createElement('image'), x, y, width, height, cornerRadius: 36 });
const footer = (number: string): SlideElement[] => [text('CHAPTER / STUDIO', 100, 1000, 500, 35, 20, { letterSpacing: 3 }), text(number, 1740, 1000, 80, 35, 20, { align: 'right' })];
const slide = (elements: SlideElement[], layoutId = 'title-content', color = '#fffaf5'): Slide => ({ id: nanoid(), elements, background: { type: 'solid', color }, notes: '', transition: { effect: 'fade', duration: 0.45 }, layoutId });

export function createSlide(layout = 'blank'): Slide {
  switch (layout) {
    case 'title': return slide([text('A new perspective.', 120, 320, 1560, 220, 132, { bold: true }), text('A little context for your big idea.', 130, 650, 1300, 120, 44)], layout);
    case 'title-content': return slide([text('Slide title', 120, 110, 1680, 160, 96, { bold: true }), text('Start with the story you want to tell.\n\nAdd your key points, ideas, and supporting details.', 130, 350, 1500, 550, 48)], layout);
    case 'section': return slide([text('01', 130, 150, 300, 100, 64, { color: '#ed7355' }), text('The big idea.', 120, 410, 1600, 240, 144, { bold: true })], layout, '#f7e8dc');
    case 'two-column': return slide([text('Two sides. One story.', 120, 110, 1680, 160, 96, { bold: true }), text('First perspective', 130, 350, 770, 120, 56, { bold: true }), text('Add your supporting ideas here.', 130, 510, 770, 400), text('Second perspective', 1030, 350, 770, 120, 56, { bold: true }), text('Add your supporting ideas here.', 1030, 510, 770, 400)], layout);
    case 'image-right': return slide([photo(1060, 100, 760, 880), text('Show, don’t\njust tell.', 120, 270, 860, 350, 112, { bold: true }), text('Make your message memorable with a powerful visual.', 130, 710, 770, 160, 44)], layout);
    case 'full-image': return slide([photo(0, 0, 1920, 1080), box(0, 700, 1920, 380, '#292825'), text('A picture worth a story.', 130, 785, 1600, 150, 100, { color: '#ffffff', bold: true })], layout);
    case 'comparison': return slide([text('Find your difference.', 120, 110, 1680, 160, 96, { bold: true }), box(120, 330, 810, 600, '#f7e8dc', 30), box(990, 330, 810, 600, '#e7ece1', 30), text('Today', 170, 390, 700, 100, 64, { bold: true }), text('Where we are now.\nWhat is working.\nWhat can be better.', 170, 550, 680, 300, 44), text('Tomorrow', 1040, 390, 700, 100, 64, { bold: true }), text('Where we want to go.\nWhat we will build.\nHow we will get there.', 1040, 550, 680, 300, 44)], layout);
    default: return slide([], 'blank');
  }
}

export function createPresentation(): Presentation {
  const cover = slide([
    box(115, 145, 650, 64, '#f3dfd2', 32), text('Q3 2025 · STRATEGY & VISION', 143, 161, 600, 40, 24, { letterSpacing: 3 }),
    text('The next\nchapter.', 110, 335, 930, 385, 150, { bold: false, letterSpacing: -6 }),
    text('Big ideas. Clear direction.\nA bold plan for what comes next.', 125, 782, 865, 125, 38, { color: '#68605a' }),
    { ...createElement('image'), x: 1070, y: 140, width: 700, height: 800, cornerRadius: 24 },
    { ...createElement('shape', 'ellipse'), x: 980, y: 766, width: 260, height: 260, fill: { type: 'solid', color: '#ed7355' } },
    text('ACME STUDIO', 125, 1000, 630, 35, 20, { letterSpacing: 3 }), text('01', 1740, 1000, 80, 35, 20, { align: 'right' }),
  ], 'title', '#f7eee6');
  cover.notes = 'Welcome the team. This quarter is about turning our creative ambition into focused, meaningful growth.';
  const overview = slide([
    text('01 / THE OVERVIEW', 120, 105, 1200, 70, 26, { color: '#ed7355', letterSpacing: 3 }),
    text('A fresh perspective.\nA shared ambition.', 115, 230, 1670, 290, 110, { bold: true, letterSpacing: -4 }),
    ...['Build with purpose', 'Grow together', 'Make it matter'].flatMap((heading, i) => [box(120 + i * 570, 600, 530, 300, i === 1 ? '#e5eadf' : '#f7e8dc', 24), text(`0${i + 1}`, 155 + i * 570, 635, 400, 60, 30, { color: '#ed7355' }), text(heading, 155 + i * 570, 725, 440, 75, 45, { bold: true }), text(['Focus on the work that moves\nour customers forward.', 'Bring our people and ideas\ncloser than ever.', 'Create lasting value,\nnot just another launch.'][i] ?? '', 155 + i * 570, 810, 450, 75, 27)]), ...footer('02'),
  ]);
  overview.notes = 'Our three priorities: intentional products, stronger collaboration, and impact that lasts.';
  const opportunity = slide([
    text('02 / THE OPPORTUNITY', 120, 105, 1200, 70, 26, { color: '#ed7355', letterSpacing: 3 }),
    text('The moment\nis ours.', 115, 260, 950, 310, 126, { bold: true, letterSpacing: -4 }),
    text('Our customers are ready for something better.\nWe’re ready to build it.', 125, 660, 890, 150, 37, { color: '#68605a' }),
    box(1110, 240, 690, 620, '#f7e8dc', 32), text('72%', 1170, 320, 570, 190, 168, { bold: true, color: '#ed7355' }),
    text('want simpler, more\nthoughtful experiences.', 1175, 575, 570, 150, 44), text('Illustrative customer insight', 1175, 790, 580, 40, 23, { color: '#81746b' }), ...footer('03'),
  ]);
  const strategy = slide([
    text('03 / OUR STRATEGY', 120, 105, 1200, 70, 26, { color: '#ed7355', letterSpacing: 3 }),
    text('Less noise.\nMore momentum.', 115, 225, 1500, 290, 112, { bold: true, letterSpacing: -4 }),
    ...['Simplify the experience', 'Elevate the essentials', 'Connect the community'].flatMap((heading, i) => [text(`0${i + 1}`, 130, 620 + i * 110, 110, 70, 40, { color: '#ed7355' }), text(heading, 280, 620 + i * 110, 860, 75, 44, { bold: true }), text(['Remove friction at every step.', 'Do fewer things, exceptionally well.', 'Create space for shared progress.'][i] ?? '', 1140, 632 + i * 110, 670, 65, 30)]), ...footer('04'),
  ]);
  const roadmap = slide([
    text('04 / THE ROADMAP', 120, 105, 1200, 70, 26, { color: '#ed7355', letterSpacing: 3 }),
    text('From ambition\nto action.', 115, 225, 1600, 290, 112, { bold: true, letterSpacing: -4 }),
    box(140, 660, 1630, 4, '#ddcdbf'),
    ...['Discover', 'Build', 'Launch'].flatMap((heading, i) => [{ ...createElement('shape', 'ellipse'), x: 145 + i * 560, y: 644, width: 36, height: 36, fill: { type: 'solid' as const, color: '#ed7355' } }, text(['JULY', 'AUGUST', 'SEPTEMBER'][i] ?? '', 145 + i * 560, 565, 480, 55, 27, { color: '#ed7355', letterSpacing: 3 }), text(heading, 145 + i * 560, 720, 480, 85, 54, { bold: true }), text(['Listen deeply.\nDefine what matters.', 'Prototype quickly.\nRefine with intention.', 'Show up boldly.\nLearn and keep growing.'][i] ?? '', 145 + i * 560, 825, 470, 100, 30)]), ...footer('05'),
  ]);
  const thanks = slide([
    { ...createElement('shape', 'ellipse'), x: 1450, y: -230, width: 720, height: 720, fill: { type: 'solid', color: '#ed7355' } },
    text('Here’s to\nwhat’s next.', 115, 300, 1580, 380, 154, { bold: true, letterSpacing: -6 }),
    text('Let’s write this chapter together.', 125, 780, 1420, 100, 45, { color: '#68605a' }),
    text('THANK YOU', 125, 155, 950, 60, 26, { letterSpacing: 4 }), ...footer('06'),
  ], 'section', '#f9eee4');
  const now = new Date().toISOString();
  return { version: 1, id: nanoid(), title: 'The next chapter', slideSize: { width: 1920, height: 1080 }, theme: structuredClone(defaultTheme), slides: [cover, overview, opportunity, strategy, roadmap, thanks], createdAt: now, updatedAt: now };
}
