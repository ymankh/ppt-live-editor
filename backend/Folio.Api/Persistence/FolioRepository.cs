using System.Text;
using Microsoft.Data.Sqlite;

namespace Folio.Api.Persistence;

public sealed class FolioRepository
{
    private readonly string connectionString;

    public FolioRepository(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredPath = configuration["Database:Path"] ?? "App_Data/folio.db";
        var path = Path.GetFullPath(configuredPath, environment.ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = path,
            Mode = SqliteOpenMode.ReadWriteCreate,
            ForeignKeys = true,
            DefaultTimeout = 30
        }.ToString();
    }

    public void Initialize()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
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
            """;
        command.ExecuteNonQuery();
    }

    public string ListProjects()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT summary FROM projects ORDER BY updated_ticks DESC, id";
        using var reader = command.ExecuteReader();
        var json = new StringBuilder("[");
        while (reader.Read())
        {
            if (json.Length > 1) json.Append(',');
            json.Append(reader.GetString(0));
        }
        return json.Append(']').ToString();
    }

    public string? GetProject(string id)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT document FROM projects WHERE id = $id";
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteScalar() as string;
    }

    public string? GetLatestProject()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT document FROM projects ORDER BY updated_ticks DESC, id LIMIT 1";
        return command.ExecuteScalar() as string;
    }

    public bool SaveProject(ProjectDocument document, bool createOnly)
    {
        using var connection = Open();
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = createOnly
            ? "INSERT INTO projects(id, document, summary, updated_ticks) VALUES($id, $document, $summary, $updated) ON CONFLICT(id) DO NOTHING"
            : "INSERT INTO projects(id, document, summary, updated_ticks) VALUES($id, $document, $summary, $updated) ON CONFLICT(id) DO UPDATE SET document = excluded.document, summary = excluded.summary, updated_ticks = excluded.updated_ticks";
        command.Parameters.AddWithValue("$id", document.Id);
        command.Parameters.AddWithValue("$document", document.Json);
        command.Parameters.AddWithValue("$summary", document.SummaryJson);
        command.Parameters.AddWithValue("$updated", document.UpdatedTicks);
        if (command.ExecuteNonQuery() == 0) return false;

        command.Parameters.Clear();
        command.CommandText = "DELETE FROM project_assets WHERE project_id = $id";
        command.Parameters.AddWithValue("$id", document.Id);
        command.ExecuteNonQuery();
        command.CommandText = "INSERT INTO project_assets(project_id, asset_id) VALUES($id, $asset)";
        var assetParameter = command.Parameters.Add("$asset", SqliteType.Text);
        foreach (var assetId in document.AssetIds)
        {
            assetParameter.Value = assetId;
            command.ExecuteNonQuery();
        }
        transaction.Commit();
        return true;
    }

    public void DeleteProject(string id)
    {
        using var connection = Open();
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        // Only this project's current references are candidates. Unclaimed uploads
        // and assets still referenced by another project are never collected.
        command.CommandText = """
            DELETE FROM assets
            WHERE id IN (SELECT asset_id FROM project_assets WHERE project_id = $id)
              AND NOT EXISTS (
                SELECT 1 FROM project_assets
                WHERE asset_id = assets.id AND project_id <> $id
              );
            DELETE FROM projects WHERE id = $id;
            """;
        command.Parameters.AddWithValue("$id", id);
        command.ExecuteNonQuery();
        transaction.Commit();
    }

    public bool PutAsset(string id, string contentType, byte[] content, bool createOnly)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = createOnly
            ? "INSERT INTO assets(id, content_type, content) VALUES($id, $type, $content) ON CONFLICT(id) DO NOTHING"
            : "INSERT INTO assets(id, content_type, content) VALUES($id, $type, $content) ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, content = excluded.content";
        command.Parameters.AddWithValue("$id", id);
        command.Parameters.AddWithValue("$type", contentType);
        command.Parameters.Add("$content", SqliteType.Blob).Value = content;
        return command.ExecuteNonQuery() != 0;
    }

    public StoredAsset? GetAsset(string id)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT content_type, content FROM assets WHERE id = $id";
        command.Parameters.AddWithValue("$id", id);
        using var reader = command.ExecuteReader();
        return reader.Read() ? new StoredAsset(reader.GetString(0), (byte[])reader.GetValue(1)) : null;
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        try
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA busy_timeout = 30000;";
            command.ExecuteNonQuery();
            return connection;
        }
        catch
        {
            connection.Dispose();
            throw;
        }
    }
}

public sealed record StoredAsset(string ContentType, byte[] Content);
