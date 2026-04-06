var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add the MCP services: the transport to use (http) and the tools to register.
builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithTools<RandomNumberTools>();

var app = builder.Build();

app.MapDefaultEndpoints();

app.MapGet("/health", () => Results.Ok("healthy"));

// Map the MCP endpoint — clients connect here to discover and invoke tools.
app.MapMcp();

app.Run();
