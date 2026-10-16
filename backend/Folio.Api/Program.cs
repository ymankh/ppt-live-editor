using Folio.Api.Persistence;
using Folio.Api.Users;

const long maximumRequestBytes = 100L * 1024 * 1024;
var builder = WebApplication.CreateBuilder(args);
if (string.IsNullOrEmpty(builder.Configuration["urls"]))
    builder.WebHost.UseUrls("http://localhost:5080");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maximumRequestBytes);
builder.Services.Configure<IISServerOptions>(options => options.MaxRequestBodySize = maximumRequestBytes);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
if (builder.Environment.IsDevelopment())
    builder.Services.AddOpenApi();
builder.Services.AddSingleton<FolioRepository>();
builder.Services.AddScoped<ICurrentUserProvider, LocalCurrentUserProvider>();

var app = builder.Build();
app.Services.GetRequiredService<FolioRepository>().Initialize();
app.UseExceptionHandler();
app.UseStatusCodePages();
if (app.Environment.IsDevelopment())
    app.MapOpenApi();
app.MapControllers();
app.Run();
