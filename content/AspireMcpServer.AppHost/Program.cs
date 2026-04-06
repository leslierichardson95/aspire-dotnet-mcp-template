var builder = DistributedApplication.CreateBuilder(args);

var inspectorVersion = builder.Configuration["MCP_INSPECTOR_VERSION"]
    ?? builder.Configuration["McpInspector:Version"]
    ?? "latest";

// ── MCP Server ───────────────────────────────────────────────────────────────
// The MCP server hosts tools accessible via the Model Context Protocol over HTTP.
var mcpServer = builder.AddProject<Projects.AspireMcpServer_McpServer>("mcp-server")
    .WithHttpHealthCheck("/health");

// ── MCP Inspector ────────────────────────────────────────────────────────────
// The MCP Inspector provides a web UI for testing and debugging MCP tools.
// Uses npx to run @modelcontextprotocol/inspector (requires Node.js).
var inspector = builder.AddMcpInspector("inspector", options =>
    {
        options.InspectorVersion = inspectorVersion;
    })
    .WithMcpServer(mcpServer, path: "/");

builder.Build().Run();
