import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Fill, Presentation } from '../../types/model';
import { strings } from "@/strings";
import { request } from '@/lib/api';


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
let migration: Promise<void> | undefined;
const projectUrl = (id: string) => `${strings.persistence.projectsApi}/${encodeURIComponent(id)}`;
export const assetUrl = (id: string): string => strings.persistence.externalAssetPattern.test(id)
  ? id
  : `${strings.persistence.assetsApi}/${encodeURIComponent(id)}`;


async function migrateLocalProjects(): Promise<void> {
  const db = await connect();
  if (await db.get(strings.persistence.settings, strings.persistence.migrationComplete) === true) return;
  const uploaded = new Set<string>();
  for (const document of await db.getAll(strings.persistence.projects)) {
    for (const reference of assetReferences(document)) {
      if (strings.persistence.externalAssetPattern.test(reference)) continue;
      if (uploaded.has(reference)) continue;
      const blob = await db.get(strings.persistence.assets, reference);
      if (!blob) continue;
      await request(assetUrl(reference), {
        method: strings.persistence.putMethod,
        headers: {
          [strings.persistence.contentType]: blob.type || strings.persistence.binaryContentType,
          [strings.persistence.ifNoneMatch]: strings.persistence.anyMatch,
        },
        body: blob,
      }, 412);
      uploaded.add(reference);
    }
    await request(projectUrl(document.id), {
      method: strings.persistence.putMethod,
      headers: {
        [strings.persistence.contentType]: strings.persistence.jsonContentType,
        [strings.persistence.ifNoneMatch]: strings.persistence.anyMatch,
      },
      body: JSON.stringify(document),
    }, 412);
  }
  // Keep the source documents and blobs intact for recovery.
  await db.put(strings.persistence.settings, true, strings.persistence.migrationComplete);
}

const ensureMigrated = () => migration ??= migrateLocalProjects().catch((error: unknown) => {
  migration = undefined;
  throw error;
});

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
  await ensureMigrated();
  await request(projectUrl(document.id), {
    method: strings.persistence.putMethod,
    headers: { [strings.persistence.contentType]: strings.persistence.jsonContentType },
    body: JSON.stringify(document),
  });
}
export async function getProject(id: string): Promise<Presentation | undefined> {
  await ensureMigrated();
  const response = await request(projectUrl(id), undefined, 404);
  return response.status === 404 ? undefined : response.json() as Promise<Presentation>;
}
export async function getLastProject(): Promise<Presentation | undefined> {
  await ensureMigrated();
  const response = await request(strings.persistence.latestProjectApi, undefined, 404);
  return response.status === 404 ? undefined : response.json() as Promise<Presentation>;
}
export async function listProjects(): Promise<ProjectSummary[]> {
  await ensureMigrated();
  return (await request(strings.persistence.projectsApi)).json() as Promise<ProjectSummary[]>;
}
export async function deleteProject(id: string): Promise<void> {
  await ensureMigrated();
  await request(projectUrl(id), { method: strings.persistence.deleteMethod });
}
export async function putAsset(id: string, blob: Blob): Promise<void> {
  await request(assetUrl(id), {
    method: strings.persistence.putMethod,
    headers: { [strings.persistence.contentType]: blob.type || strings.persistence.binaryContentType },
    body: blob,
  });
}
export async function getAsset(id: string): Promise<Blob | undefined> {
  if (strings.persistence.externalAssetPattern.test(id)) return undefined;
  const response = await request(assetUrl(id), undefined, 404);
  return response.status === 404 ? undefined : response.blob();
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
