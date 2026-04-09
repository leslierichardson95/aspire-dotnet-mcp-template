var builder = DistributedApplication.CreateBuilder(args);

var inspectorVersion = builder.Configuration["MCP_INSPECTOR_VERSION"]
    ?? builder.Configuration["McpInspector:Version"]
    ?? "latest";

// ── MCP Server ───────────────────────────────────────────────────────────────
// The MCP server hosts tools accessible via the Model Context Protocol over HTTP.
#if (IsCSharp)
var mcpServer = builder.AddProject<Projects.AspireMcpServer_McpServer>("mcp-server")
    .WithHttpHealthCheck("/health");
#elseif (IsTypeScript)
var mcpServer = builder.AddNpmApp("mcp-server", "../McpServer.TypeScript", "start")
    .WithHttpEndpoint(env: "PORT")
    .WithHttpHealthCheck("/health");
#elseif (IsPython)
var mcpServer = builder.AddPythonApp("mcp-server", "../McpServer.Python", "server.py")
    .WithHttpEndpoint(env: "PORT")
    .WithHttpHealthCheck("/health");
#endif

// ── MCP Inspector ────────────────────────────────────────────────────────────
// The MCP Inspector provides a web UI for testing and debugging MCP tools.
// Uses npx to run @modelcontextprotocol/inspector (requires Node.js).
var inspector = builder.AddMcpInspector("inspector", options =>
    {
        options.InspectorVersion = inspectorVersion;
    })
#if (IsPython)
    .WithMcpServer(mcpServer, path: "/mcp");
#else
    .WithMcpServer(mcpServer, path: "/");
#endif

builder.Build().Run();
