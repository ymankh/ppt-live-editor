var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.Folio_Api>("api", launchProfileName: "http")
    .WithHttpHealthCheck("/api/health");

if (builder.Configuration["Database:Path"] is { Length: > 0 } databasePath)
    api.WithEnvironment("Database__Path", Path.GetFullPath(databasePath, builder.AppHostDirectory));

builder.AddViteApp("frontend", "../frontend")
    .WithNpm(installCommand: "ci")
    .WithReference(api)
    .WithEnvironment("FOLIO_API_URL", api.GetEndpoint("http"))
    .WithArgs("--strictPort")
    .WaitFor(api)
    .WithExternalHttpEndpoints();

builder.Build().Run();
