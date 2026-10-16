import { nanoid } from 'nanoid';
import { textDocument, type ElementBase, type ElementOf, type ElementType, type Presentation, type ShapeKind, type Slide, type SlideElement, type TextElement, type Theme } from '../types/model';
import { strings } from "@/strings";


const defaultTheme: Theme = { id: strings.defaults.studio, name: strings.defaults.studio_0aa91af2, colors: { background: strings.defaults.colorfffaf5, text: strings.defaults.color292825, primary: strings.common.colored7355, secondary: strings.defaults.colorf7e8dc, accent: [strings.common.colored7355, strings.defaults.colorb8c4aa, strings.defaults.colore5bd80, strings.defaults.color8c9aaf] }, fonts: { heading: strings.common.geist, body: strings.common.geist } };
export const themes: Theme[] = [
  defaultTheme,
  { id: strings.defaults.midnight, name: strings.defaults.midnight_aa996cf2, colors: { background: strings.defaults.color182334, text: strings.defaults.colorf5f7fb, primary: strings.defaults.colora7baf7, secondary: strings.defaults.color2c3b52, accent: [strings.defaults.colora7baf7, strings.defaults.color72d2c4, strings.defaults.colorefbe7d, strings.defaults.colorec99c1] }, fonts: { heading: strings.common.geist, body: strings.common.geist } },
  { id: strings.defaults.sage, name: strings.common.sage, colors: { background: strings.defaults.colorf4f6ee, text: strings.defaults.color29392e, primary: strings.defaults.color71856a, secondary: strings.defaults.colordce4d4, accent: [strings.defaults.color71856a, strings.defaults.colord5a66b, strings.defaults.colorb8c2a9, strings.defaults.color7eaaa0] }, fonts: { heading: strings.common.geist, body: strings.common.geist } },
  { id: strings.defaults.ocean, name: strings.defaults.ocean_fed12611, colors: { background: strings.defaults.colorf1f7fa, text: strings.defaults.color173348, primary: strings.defaults.color3e8fa8, secondary: strings.defaults.colord6eaf0, accent: [strings.defaults.color3e8fa8, strings.defaults.colorf0b27a, strings.defaults.color729bc1, strings.defaults.color9ac7b5] }, fonts: { heading: strings.common.geist, body: strings.common.geist } },
  { id: strings.defaults.plum, name: strings.defaults.plum_c8b2fae9, colors: { background: strings.defaults.colorfaf5fa, text: strings.defaults.color39293e, primary: strings.defaults.color9264a1, secondary: strings.defaults.coloreddfef, accent: [strings.defaults.color9264a1, strings.defaults.colord98eaf, strings.defaults.colorbaa76d, strings.defaults.color85a7ad] }, fonts: { heading: strings.common.geist, body: strings.common.geist } },
  { id: strings.defaults.mono, name: strings.defaults.monochrome, colors: { background: strings.common.colorffffff, text: strings.defaults.color202020, primary: strings.common.color333333, secondary: strings.defaults.coloreeeeee, accent: [strings.common.color333333, strings.defaults.color777777, strings.defaults.coloraaaaaa, strings.defaults.colordddddd] }, fonts: { heading: strings.common.geist, body: strings.common.geist } },
];
export const layouts = [
  { id: strings.defaults.title, name: strings.defaults.titleSlide }, { id: strings.defaults.titleContent_a43cc9ac, name: strings.defaults.titleContent },
  { id: strings.defaults.section, name: strings.defaults.sectionHeader }, { id: strings.defaults.twoColumn, name: strings.defaults.twoColumns },
  { id: strings.defaults.imageRight, name: strings.defaults.imageText }, { id: strings.defaults.fullImage_4278820b, name: strings.defaults.fullImage },
  { id: strings.defaults.comparison, name: strings.defaults.comparison_57152733 }, { id: strings.common.blank_ff71cf74, name: strings.defaults.blank },
];
export const coverImage = strings.defaults.httpsImagesUnsplashComPhoto1497366754035F200968a6e72AutoFormat;
const base = (name: string): ElementBase => ({ id: nanoid(), name, x: 640, y: 380, width: 640, height: 320, rotation: 0, opacity: 1, locked: false, hidden: false, animations: [] });

export function createElement<T extends ElementType>(type: T, shape?: ShapeKind): ElementOf<T>;
export function createElement(type: ElementType, shape: ShapeKind = strings.common.rect): SlideElement {
  switch (type) {
    case strings.common.text: return { ...base(strings.common.text_71988c4d), type, width: 760, height: 120, content: textDocument(strings.defaults.yourTextHere), verticalAlign: strings.common.top, autoFit: strings.common.none, padding: 0, fill: { type: strings.common.none }, stroke: null, shadow: null, cornerRadius: 0, fontSize: 64, fontFamily: strings.common.geist, color: strings.defaults.color292825, bold: false, italic: false, align: strings.common.left, letterSpacing: 0 };
    case strings.common.shape: return { ...base(strings.common.shape_e0e49270), type, shape, fill: { type: strings.common.solid, color: strings.common.colored7355 }, stroke: null, shadow: null, cornerRadius: shape === strings.common.roundRect ? 32 : 0, flipH: false, flipV: false, text: null, textVerticalAlign: strings.common.middle };
    case strings.common.line: return { ...base(strings.common.line_d7852cd0), type, width: 640, height: 0, start: { x: 0, y: 0 }, end: { x: 640, y: 0 }, curve: strings.common.straight, stroke: { color: strings.defaults.color292825, width: 4, style: strings.common.solid }, startArrow: strings.common.none, endArrow: strings.common.none };
    case strings.common.image: return { ...base(strings.common.image_1aa4cb0b), type, assetId: coverImage, naturalWidth: 1400, naturalHeight: 1000, crop: { x: 0, y: 0, width: 1, height: 1 }, filters: { brightness: 1, contrast: 1, saturation: 1, blur: 0, grayscale: 0 }, flipH: false, flipV: false, stroke: null, shadow: null, cornerRadius: 24, clipShape: strings.common.roundRect };
    case strings.common.table: return { ...base(strings.common.table_16d1c905), type, width: 900, height: 360, rows: Array.from({ length: 4 }, (_, row) => ({ id: nanoid(), height: 90, cells: (row === 0 ? [strings.defaults.initiative, strings.defaults.owner, strings.defaults.status] : [strings.defaults.newInitiative, strings.defaults.team, strings.defaults.inProgress]).map(value => ({ id: nanoid(), content: textDocument(value), fill: { type: strings.common.solid, color: row === 0 ? strings.defaults.colorf7e8dc : strings.common.colorffffff }, colSpan: 1, rowSpan: 1 })) })), columnWidths: [300, 300, 300], style: { headerRow: true, bandedRows: true, borderColor: strings.defaults.colordedbd5, borderWidth: 1, headerFill: { type: strings.common.solid, color: strings.defaults.colorf7e8dc } } };
    case strings.common.chart: return { ...base(strings.common.chart_3e5b90ae), type, width: 1000, height: 600, chart: strings.common.bar, categories: [strings.defaults.q1, strings.defaults.q2, strings.defaults.q3, strings.defaults.q4], series: [{ id: nanoid(), name: strings.defaults.growth, color: strings.common.colored7355, values: [24, 38, 56, 82] }, { id: nanoid(), name: strings.common.target, color: strings.defaults.colorb8c4aa, values: [30, 42, 60, 90] }], options: { showLegend: true, showGrid: true, showValues: false, stacked: false, title: strings.defaults.quarterlyGrowth } };
  }
}

const text = (value: string, x: number, y: number, width: number, height: number, size = 48, extras: Partial<TextElement> = {}): TextElement => ({ ...createElement(strings.common.text), name: value.split(strings.common.newline)[0] ?? strings.common.empty, content: textDocument(value), x, y, width, height, fontSize: size, ...extras });
const box = (x: number, y: number, width: number, height: number, color: string, radius = 0): SlideElement => ({ ...createElement(strings.common.shape, radius ? strings.common.roundRect : strings.common.rect), x, y, width, height, fill: { type: strings.common.solid, color }, cornerRadius: radius });
const photo = (x: number, y: number, width: number, height: number): SlideElement => ({ ...createElement(strings.common.image), x, y, width, height, cornerRadius: 36 });
const footer = (number: string): SlideElement[] => [text(strings.defaults.cHAPTERSTUDIO, 100, 1000, 500, 35, 20, { letterSpacing: 3 }), text(number, 1740, 1000, 80, 35, 20, { align: strings.common.right })];
const slide = (elements: SlideElement[], layoutId: string = strings.defaults.titleContent_a43cc9ac, color: string = strings.defaults.colorfffaf5): Slide => ({ id: nanoid(), elements, background: { type: strings.common.solid, color }, notes: strings.common.empty, transition: { effect: strings.common.fade, duration: 0.45 }, layoutId });

export function createSlide(layout: string = strings.common.blank_ff71cf74): Slide {
  switch (layout) {
    case strings.defaults.title: return slide([text(strings.defaults.aNewPerspective, 120, 320, 1560, 220, 132, { bold: true }), text(strings.defaults.aLittleContextForYourBigIdea, 130, 650, 1300, 120, 44)], layout);
    case strings.defaults.titleContent_a43cc9ac: return slide([text(strings.defaults.slideTitle, 120, 110, 1680, 160, 96, { bold: true }), text(strings.defaults.startWithTheStoryYouWantToTellAdd, 130, 350, 1500, 550, 48)], layout);
    case strings.defaults.section: return slide([text(strings.defaults.value01, 130, 150, 300, 100, 64, { color: strings.common.colored7355 }), text(strings.defaults.theBigIdea, 120, 410, 1600, 240, 144, { bold: true })], layout, strings.defaults.colorf7e8dc);
    case strings.defaults.twoColumn: return slide([text(strings.defaults.twoSidesOneStory, 120, 110, 1680, 160, 96, { bold: true }), text(strings.defaults.firstPerspective, 130, 350, 770, 120, 56, { bold: true }), text(strings.defaults.addYourSupportingIdeasHere, 130, 510, 770, 400), text(strings.defaults.secondPerspective, 1030, 350, 770, 120, 56, { bold: true }), text(strings.defaults.addYourSupportingIdeasHere, 1030, 510, 770, 400)], layout);
    case strings.defaults.imageRight: return slide([photo(1060, 100, 760, 880), text(strings.defaults.showDonTJustTell, 120, 270, 860, 350, 112, { bold: true }), text(strings.defaults.makeYourMessageMemorableWithAPowerfulVisual, 130, 710, 770, 160, 44)], layout);
    case strings.defaults.fullImage_4278820b: return slide([photo(0, 0, 1920, 1080), box(0, 700, 1920, 380, strings.defaults.color292825), text(strings.defaults.aPictureWorthAStory, 130, 785, 1600, 150, 100, { color: strings.common.colorffffff, bold: true })], layout);
    case strings.defaults.comparison: return slide([text(strings.defaults.findYourDifference, 120, 110, 1680, 160, 96, { bold: true }), box(120, 330, 810, 600, strings.defaults.colorf7e8dc, 30), box(990, 330, 810, 600, strings.defaults.colore7ece1, 30), text(strings.defaults.today, 170, 390, 700, 100, 64, { bold: true }), text(strings.defaults.whereWeAreNowWhatIsWorkingWhatCan, 170, 550, 680, 300, 44), text(strings.defaults.tomorrow, 1040, 390, 700, 100, 64, { bold: true }), text(strings.defaults.whereWeWantToGoWhatWeWillBuild, 1040, 550, 680, 300, 44)], layout);
    default: return slide([], strings.common.blank_ff71cf74);
  }
}

export function createPresentation(): Presentation {
  const cover = slide([
    box(115, 145, 650, 64, strings.defaults.colorf3dfd2, 32), text(strings.defaults.q32025STRATEGYVISION, 143, 161, 600, 40, 24, { letterSpacing: 3 }),
    text(strings.common.theNextChapter, 110, 335, 930, 385, 150, { bold: false, letterSpacing: -6 }),
    text(strings.defaults.bigIdeasClearDirectionABoldPlanForWhat, 125, 782, 865, 125, 38, { color: strings.defaults.color68605a }),
    { ...createElement(strings.common.image), x: 1070, y: 140, width: 700, height: 800, cornerRadius: 24 },
    { ...createElement(strings.common.shape, strings.common.ellipse), x: 980, y: 766, width: 260, height: 260, fill: { type: strings.common.solid, color: strings.common.colored7355 } },
    text(strings.defaults.aCMESTUDIO, 125, 1000, 630, 35, 20, { letterSpacing: 3 }), text(strings.defaults.value01, 1740, 1000, 80, 35, 20, { align: strings.common.right }),
  ], strings.defaults.title, strings.common.colorf7eee6);
  cover.notes = strings.defaults.welcomeTheTeamThisQuarterIsAboutTurningOur;
  const overview = slide([
    text(strings.defaults.value01THEOVERVIEW, 120, 105, 1200, 70, 26, { color: strings.common.colored7355, letterSpacing: 3 }),
    text(strings.defaults.aFreshPerspectiveASharedAmbition, 115, 230, 1670, 290, 110, { bold: true, letterSpacing: -4 }),
    ...[strings.defaults.buildWithPurpose, strings.defaults.growTogether, strings.defaults.makeItMatter].flatMap((heading, i) => [box(120 + i * 570, 600, 530, 300, i === 1 ? strings.defaults.colore5eadf : strings.defaults.colorf7e8dc, 24), text(`${strings.common.value0}${i + 1}`, 155 + i * 570, 635, 400, 60, 30, { color: strings.common.colored7355 }), text(heading, 155 + i * 570, 725, 440, 75, 45, { bold: true }), text([strings.defaults.focusOnTheWorkThatMovesOurCustomersForward, strings.defaults.bringOurPeopleAndIdeasCloserThanEver, strings.defaults.createLastingValueNotJustAnotherLaunch][i] ?? strings.common.empty, 155 + i * 570, 810, 450, 75, 27)]), ...footer(strings.defaults.value02),
  ]);
  overview.notes = strings.defaults.ourThreePrioritiesIntentionalProductsStrongerCollaborationAndImpact;
  const opportunity = slide([
    text(strings.defaults.value02THEOPPORTUNITY, 120, 105, 1200, 70, 26, { color: strings.common.colored7355, letterSpacing: 3 }),
    text(strings.defaults.theMomentIsOurs, 115, 260, 950, 310, 126, { bold: true, letterSpacing: -4 }),
    text(strings.defaults.ourCustomersAreReadyForSomethingBetterWeRe, 125, 660, 890, 150, 37, { color: strings.defaults.color68605a }),
    box(1110, 240, 690, 620, strings.defaults.colorf7e8dc, 32), text(strings.defaults.value72, 1170, 320, 570, 190, 168, { bold: true, color: strings.common.colored7355 }),
    text(strings.defaults.wantSimplerMoreThoughtfulExperiences, 1175, 575, 570, 150, 44), text(strings.defaults.illustrativeCustomerInsight, 1175, 790, 580, 40, 23, { color: strings.defaults.color81746b }), ...footer(strings.defaults.value03),
  ]);
  const strategy = slide([
    text(strings.defaults.value03OURSTRATEGY, 120, 105, 1200, 70, 26, { color: strings.common.colored7355, letterSpacing: 3 }),
    text(strings.defaults.lessNoiseMoreMomentum, 115, 225, 1500, 290, 112, { bold: true, letterSpacing: -4 }),
    ...[strings.defaults.simplifyTheExperience, strings.defaults.elevateTheEssentials, strings.defaults.connectTheCommunity].flatMap((heading, i) => [text(`${strings.common.value0}${i + 1}`, 130, 620 + i * 110, 110, 70, 40, { color: strings.common.colored7355 }), text(heading, 280, 620 + i * 110, 860, 75, 44, { bold: true }), text([strings.defaults.removeFrictionAtEveryStep, strings.defaults.doFewerThingsExceptionallyWell, strings.defaults.createSpaceForSharedProgress][i] ?? strings.common.empty, 1140, 632 + i * 110, 670, 65, 30)]), ...footer(strings.defaults.value04),
  ]);
  const roadmap = slide([
    text(strings.defaults.value04THEROADMAP, 120, 105, 1200, 70, 26, { color: strings.common.colored7355, letterSpacing: 3 }),
    text(strings.defaults.fromAmbitionToAction, 115, 225, 1600, 290, 112, { bold: true, letterSpacing: -4 }),
    box(140, 660, 1630, 4, strings.defaults.colorddcdbf),
    ...[strings.defaults.discover, strings.defaults.build, strings.defaults.launch].flatMap((heading, i) => [{ ...createElement(strings.common.shape, strings.common.ellipse), x: 145 + i * 560, y: 644, width: 36, height: 36, fill: { type: strings.common.solid, color: strings.common.colored7355 } }, text([strings.defaults.jULY, strings.defaults.aUGUST, strings.defaults.sEPTEMBER][i] ?? strings.common.empty, 145 + i * 560, 565, 480, 55, 27, { color: strings.common.colored7355, letterSpacing: 3 }), text(heading, 145 + i * 560, 720, 480, 85, 54, { bold: true }), text([strings.defaults.listenDeeplyDefineWhatMatters, strings.defaults.prototypeQuicklyRefineWithIntention, strings.defaults.showUpBoldlyLearnAndKeepGrowing][i] ?? strings.common.empty, 145 + i * 560, 825, 470, 100, 30)]), ...footer(strings.defaults.value05),
  ]);
  const thanks = slide([
    { ...createElement(strings.common.shape, strings.common.ellipse), x: 1450, y: -230, width: 720, height: 720, fill: { type: strings.common.solid, color: strings.common.colored7355 } },
    text(strings.defaults.hereSToWhatSNext, 115, 300, 1580, 380, 154, { bold: true, letterSpacing: -6 }),
    text(strings.defaults.letSWriteThisChapterTogether, 125, 780, 1420, 100, 45, { color: strings.defaults.color68605a }),
    text(strings.defaults.tHANKYOU, 125, 155, 950, 60, 26, { letterSpacing: 4 }), ...footer(strings.defaults.value06),
  ], strings.defaults.section, strings.defaults.colorf9eee4);
  const now = new Date().toISOString();
  return { version: 1, id: nanoid(), title: strings.common.theNextChapter_5529f97e, slideSize: { width: 1920, height: 1080 }, theme: structuredClone(defaultTheme), slides: [cover, overview, opportunity, strategy, roadmap, thanks], createdAt: now, updatedAt: now };
}
