var builder = DistributedApplication.CreateBuilder(args);

builder.AddAzureContainerAppEnvironment("aspire-env");

// Pin the MCP Inspector version. "latest" is a moving target and has shipped broken releases:
// inspector-server 0.17.5 calls controller.close() unguarded on SSE stream 'end', throwing an
// uncaught "Controller is already closed" TypeError that kills the proxy process as soon as the
// browser connects (resource goes unhealthy / "connection reset" / "check console logs").
// 0.18.0 is the first release with the guard. Override via config if you need a newer pin.
var inspectorVersion = builder.Configuration["MCP_INSPECTOR_VERSION"]
    ?? builder.Configuration["McpInspector:Version"]
    ?? "0.18.0";

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

// Local-dev only: the inspector proxy generates a fresh auth token on every launch. Browsers cache
// the previous token, so after an AppHost restart the UI authenticates with a stale token and the
// connection fails silently; the toolkit's /config health check can also flap 401 and stop the
// resource. Omitting the token keeps local runs reliable. This is loopback-only and the inspector
// still enforces Origin (DNS-rebinding) validation.
inspector.WithEnvironment("DANGEROUSLY_OMIT_AUTH", "true");

builder.Build().Run();
