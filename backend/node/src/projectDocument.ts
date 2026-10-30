export interface ProjectDocument {
  readonly id: string;
  readonly json: string;
  readonly summaryJson: string;
  /** .NET-compatible UTC ticks (100 ns since 0001-01-01), preserving ordering in databases created by the former API. */
  readonly updatedTicks: bigint;
  readonly assetIds: ReadonlySet<string>;
}

export type ReadResult = { readonly ok: true; readonly document: ProjectDocument } | { readonly ok: false; readonly error: string };

type JsonObject = { readonly [key: string]: unknown };

const defaultError =
  'A version 1 presentation with a matching ID, title, timestamps, slide size, theme and nonempty slides is required.';
const unixEpochTicks = 621_355_968_000_000_000n;
const ticksPerMillisecond = 10_000n;
const externalAssetPrefixes = ['data:', 'blob:', 'http:', 'https:'];

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const property = (value: JsonObject, key: string): unknown => (Object.hasOwn(value, key) ? value[key] : undefined);

const nonEmptyString = (value: unknown, key: string): string | undefined => {
  if (!isObject(value)) return undefined;
  const text = property(value, key);
  return typeof text === 'string' && text.trim() !== '' ? text : undefined;
};

const objectProperty = (value: JsonObject, key: string): JsonObject | undefined => {
  const child = property(value, key);
  return isObject(child) ? child : undefined;
};

const positiveNumber = (value: JsonObject, key: string): boolean => {
  const number = property(value, key);
  return typeof number === 'number' && Number.isFinite(number) && number > 0;
};

const timestamp = (text: string | undefined): number | undefined => {
  if (text === undefined) return undefined;
  const milliseconds = Date.parse(text);
  return Number.isNaN(milliseconds) ? undefined : milliseconds;
};

const validImageReference = (value: JsonObject): boolean =>
  property(value, 'type') !== 'image' || nonEmptyString(value, 'assetId') !== undefined;

// Scan all nested assetId fields, including table fills and future element kinds,
// so preserving unknown JSON fields cannot discard their asset ownership.
const collectAssets = (value: unknown, assets: Set<string>): boolean => {
  if (Array.isArray(value)) return value.every((child: unknown) => collectAssets(child, assets));
  if (!isObject(value)) return true;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'assetId') {
      if (typeof child !== 'string' || child.trim() === '') return false;
      const lower = child.toLowerCase();
      if (!externalAssetPrefixes.some((prefix) => lower.startsWith(prefix)) && !child.startsWith('//')) assets.add(child);
    } else if (!collectAssets(child, assets)) return false;
  }
  return true;
};

/** Validates the version-1 presentation envelope; the editor's Zod schema remains the full validation boundary. */
export function readProjectDocument(rawJson: string, document: unknown, routeId: string): ReadResult {
  const failure = (error: string): ReadResult => ({ ok: false, error });
  if (!isObject(document)) return failure(defaultError);

  const id = nonEmptyString(document, 'id');
  const title = property(document, 'title');
  const version = property(document, 'version');
  const createdAt = nonEmptyString(document, 'createdAt');
  const updatedAt = nonEmptyString(document, 'updatedAt');
  const updated = timestamp(updatedAt);
  const slideSize = objectProperty(document, 'slideSize');
  const theme = objectProperty(document, 'theme');
  const slides = property(document, 'slides');
  if (
    id === undefined || id !== routeId ||
    typeof title !== 'string' ||
    version !== 1 ||
    createdAt === undefined || timestamp(createdAt) === undefined ||
    updatedAt === undefined || updated === undefined ||
    slideSize === undefined || !positiveNumber(slideSize, 'width') || !positiveNumber(slideSize, 'height') ||
    theme === undefined ||
    !Array.isArray(slides) || slides.length === 0
  )
    return failure(defaultError);

  // Array.isArray narrows to an untyped array; re-type the elements as unknown.
  const slideList: readonly unknown[] = slides;
  for (const slide of slideList) {
    const background = isObject(slide) ? objectProperty(slide, 'background') : undefined;
    const elements = isObject(slide) ? property(slide, 'elements') : undefined;
    if (nonEmptyString(slide, 'id') === undefined || background === undefined || !validImageReference(background) || !Array.isArray(elements))
      return failure('Each slide must have an ID, a background and an elements array.');
    const elementList: readonly unknown[] = elements;
    for (const element of elementList) {
      if (!isObject(element) || nonEmptyString(element, 'id') === undefined || nonEmptyString(element, 'type') === undefined || !validImageReference(element))
        return failure('Each element must be an object with an ID and type; images must have an asset ID.');
    }
  }

  const assetIds = new Set<string>();
  if (!collectAssets(document, assetIds)) return failure('Asset references must be nonempty strings.');

  const summaryJson = JSON.stringify({
    id, title, updatedAt, createdAt,
    slideCount: slideList.length,
    preview: slideList[0], theme, slideSize,
  });
  const updatedTicks = BigInt(updated) * ticksPerMillisecond + unixEpochTicks;
  return { ok: true, document: { id, json: rawJson, summaryJson, updatedTicks, assetIds } };
}
