import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Fill, Presentation } from '../../types/model';
import { strings } from "@/strings";


export type SettingValue = string | number | boolean | null | SettingValue[] | { [key: string]: SettingValue };
interface ProjectDatabase extends DBSchema {
  projects: { key: string; value: Presentation; indexes: { 'by-updated': string } };
  assets: { key: string; value: Blob };
  settings: { key: string; value: SettingValue };
}
export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  slideCount: number;
  preview: Presentation['slides'][number] | undefined;
  theme: Presentation['theme'];
  slideSize:Presentation['slideSize'];
}
export interface ProjectRepository {
  saveProject(document: Presentation): Promise<void>;
  getProject(id: string): Promise<Presentation | undefined>;
  getLastProject(): Promise<Presentation | undefined>;
  listProjects(): Promise<ProjectSummary[]>;
  deleteProject(id: string): Promise<void>;
  putAsset(id: string, blob: Blob): Promise<void>;
  getAsset(id: string): Promise<Blob | undefined>;
  putSetting(key: string, value: SettingValue): Promise<void>;
  getSetting(key: string): Promise<SettingValue | undefined>;
  deleteSetting(key: string): Promise<void>;
}
const database = () => openDB<ProjectDatabase>(strings.persistence.chapterEditor, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const projects = db.createObjectStore(strings.persistence.projects, { keyPath: strings.common.id });
      projects.createIndex(strings.persistence.byUpdated, strings.persistence.updatedAt);
      db.createObjectStore(strings.persistence.assets);
    }
    if (oldVersion < 2) db.createObjectStore(strings.persistence.settings);
  },
});
let connection: Promise<IDBPDatabase<ProjectDatabase>> | undefined;
const connect = () => connection ??= database().catch((error: unknown) => { connection = undefined; throw error; });

export function assetReferences(document: Presentation): string[] {
  const references = new Set<string>();
  const collect = (fill: Fill) => { if (fill.type === strings.common.image) references.add(fill.assetId); };
  for (const slide of document.slides) {
    collect(slide.background);
    for (const element of slide.elements) {
      if (element.type === strings.common.image) references.add(element.assetId);
      if (strings.common.fill in element) collect(element.fill);
      if (element.type === strings.common.table) {
        collect(element.style.headerFill);
        for (const row of element.rows) for (const cell of row.cells) collect(cell.fill);
      }
    }
  }
  return [...references];
}

export async function saveProject(document: Presentation): Promise<void> {
  await (await connect()).put(strings.persistence.projects, document);
}
export async function getProject(id: string): Promise<Presentation | undefined> {
  return (await connect()).get(strings.persistence.projects, id);
}
export async function getLastProject(): Promise<Presentation | undefined> {
  const cursor = await (await connect()).transaction(strings.persistence.projects).store.index(strings.persistence.byUpdated).openCursor(null, strings.persistence.prev);
  return cursor?.value;
}
export async function listProjects(): Promise<ProjectSummary[]> {
  const documents = await (await connect()).getAllFromIndex(strings.persistence.projects, strings.persistence.byUpdated);
  return documents.reverse().map(document => ({ id: document.id, title: document.title, updatedAt: document.updatedAt, createdAt: document.createdAt, slideCount: document.slides.length, preview: document.slides[0], theme: document.theme,slideSize:document.slideSize }));
}
export async function deleteProject(id: string): Promise<void> {
  const db = await connect();
  // Keep the reference scan and deletes atomic with other project/asset writes.
  // Only collect assets owned by the deleted project, not pending imports.
  const transaction = db.transaction([strings.persistence.projects, strings.persistence.assets], strings.persistence.readwrite);
  const projects = transaction.objectStore(strings.persistence.projects);
  const document = await projects.get(id);
  if (!document) { await transaction.done; return; }
  const candidates = new Set(assetReferences(document));
  await projects.delete(id);
  for (const retained of await projects.getAll()) {
    for (const reference of assetReferences(retained)) candidates.delete(reference);
  }
  const assets = transaction.objectStore(strings.persistence.assets);
  await Promise.all([...candidates].map(reference => assets.delete(reference)));
  await transaction.done;
}
export async function putAsset(id: string, blob: Blob): Promise<void> {
  await (await connect()).put(strings.persistence.assets, blob, id);
}
export async function getAsset(id: string): Promise<Blob | undefined> {
  return (await connect()).get(strings.persistence.assets, id);
}
export async function putSetting(key: string, value: SettingValue): Promise<void> {
  await (await connect()).put(strings.persistence.settings, value, key);
}
export async function getSetting(key: string): Promise<SettingValue | undefined> {
  return (await connect()).get(strings.persistence.settings, key);
}
export async function deleteSetting(key: string): Promise<void> {
  await (await connect()).delete(strings.persistence.settings, key);
}

export const projectRepository: ProjectRepository = {
  saveProject, getProject, getLastProject, listProjects, deleteProject,
  putAsset, getAsset, putSetting, getSetting, deleteSetting,
};
