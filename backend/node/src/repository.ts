import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ProjectDocument } from './projectDocument.ts';

export interface StoredAsset {
  readonly contentType: string;
  readonly content: Uint8Array;
}

const schema = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      document TEXT NOT NULL,
      summary TEXT NOT NULL,
      updated_ticks INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS projects_updated ON projects(updated_ticks DESC, id);
  CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY NOT NULL,
      content_type TEXT NOT NULL,
      content BLOB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_assets (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL,
      PRIMARY KEY (project_id, asset_id)
  );
  CREATE INDEX IF NOT EXISTS project_assets_asset ON project_assets(asset_id);
`;

/**
 * SQLite persistence using Node's built-in driver. The schema matches the former ASP.NET API,
 * so existing folio.db files keep working. node:sqlite is synchronous and Node runs requests on
 * one thread, so each method (and its transaction) completes without interleaving.
 */
export class FolioRepository {
  private readonly db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  static open(databasePath: string): FolioRepository {
    if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 30000;');
    db.exec(schema);
    return new FolioRepository(db);
  }

  close(): void {
    this.db.close();
  }

  listProjects(): string {
    const rows = this.db.prepare('SELECT summary FROM projects ORDER BY updated_ticks DESC, id').all();
    return `[${rows.map((row) => String(row.summary)).join(',')}]`;
  }

  getProject(id: string): string | undefined {
    const row = this.db.prepare('SELECT document FROM projects WHERE id = ?').get(id);
    return typeof row?.document === 'string' ? row.document : undefined;
  }

  getLatestProject(): string | undefined {
    const row = this.db.prepare('SELECT document FROM projects ORDER BY updated_ticks DESC, id LIMIT 1').get();
    return typeof row?.document === 'string' ? row.document : undefined;
  }

  saveProject(document: ProjectDocument, createOnly: boolean): boolean {
    const upsert = createOnly
      ? 'INSERT INTO projects(id, document, summary, updated_ticks) VALUES(?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
      : 'INSERT INTO projects(id, document, summary, updated_ticks) VALUES(?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET document = excluded.document, summary = excluded.summary, updated_ticks = excluded.updated_ticks';
    return this.transaction(() => {
      const result = this.db.prepare(upsert).run(document.id, document.json, document.summaryJson, document.updatedTicks);
      if (Number(result.changes) === 0) return false;
      this.db.prepare('DELETE FROM project_assets WHERE project_id = ?').run(document.id);
      const link = this.db.prepare('INSERT INTO project_assets(project_id, asset_id) VALUES(?, ?)');
      for (const assetId of document.assetIds) link.run(document.id, assetId);
      return true;
    });
  }

  deleteProject(id: string): void {
    this.transaction(() => {
      // Only this project's current references are candidates. Unclaimed uploads
      // and assets still referenced by another project are never collected.
      this.db.prepare(`
        DELETE FROM assets
        WHERE id IN (SELECT asset_id FROM project_assets WHERE project_id = $id)
          AND NOT EXISTS (
            SELECT 1 FROM project_assets
            WHERE asset_id = assets.id AND project_id <> $id
          )
      `).run({ id });
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    });
  }

  putAsset(id: string, contentType: string, content: Uint8Array, createOnly: boolean): boolean {
    const sql = createOnly
      ? 'INSERT INTO assets(id, content_type, content) VALUES(?, ?, ?) ON CONFLICT(id) DO NOTHING'
      : 'INSERT INTO assets(id, content_type, content) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, content = excluded.content';
    return Number(this.db.prepare(sql).run(id, contentType, content).changes) !== 0;
  }

  getAsset(id: string): StoredAsset | undefined {
    const row = this.db.prepare('SELECT content_type, content FROM assets WHERE id = ?').get(id);
    if (row === undefined || typeof row.content_type !== 'string' || !(row.content instanceof Uint8Array)) return undefined;
    return { contentType: row.content_type, content: row.content };
  }

  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
