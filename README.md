# Aspire MCP Server App Template

A [.NET Aspire](https://learn.microsoft.com/dotnet/aspire/) project template that scaffolds a complete [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server with integrated [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for testing and debugging — ready to run in seconds.

## What's included

| Project | Description |
|---|---|
| **AppHost** | Aspire orchestrator that wires the MCP server and Inspector together |
| **McpServer** | MCP server exposing tools over Streamable HTTP (C#, TypeScript, or Python) |
| **ServiceDefaults** | *(C# only)* Shared configuration for OpenTelemetry, health checks, and resilience |

The template includes a sample `get_random_number` tool demonstrating how to define MCP tools in your chosen language.

## Language support

Choose your MCP server language at scaffold time:

```bash
dotnet new aspire-mcp -n MyMcpServer --McpLanguage csharp      # default
dotnet new aspire-mcp -n MyMcpServer --McpLanguage typescript
dotnet new aspire-mcp -n MyMcpServer --McpLanguage python
```

| Language | MCP SDK | Server framework | Aspire hosting |
|---|---|---|---|
| **C#** | `ModelContextProtocol.AspNetCore` | ASP.NET Core | `AddProject<T>()` |
| **TypeScript** | `@modelcontextprotocol/server` | Express | `AddNpmApp()` |
| **Python** | `mcp` (FastMCP) | Built-in | `AddPythonApp()` |

The AppHost (orchestrator) is always C# — that's .NET Aspire's orchestrator. The MCP Inspector integration is identical regardless of server language.

## Why use this template?

- **Zero-config Inspector** — The MCP Inspector launches automatically alongside your server via the Aspire dashboard. No separate terminal, no manual URL wiring.
- **Always-latest Inspector** — Defaults to the latest published Inspector version (`npx @modelcontextprotocol/inspector@latest`). Pin a specific version via config if needed.
- **Composable by design** — Need a database, cache, or message queue behind your MCP tools? Add them as Aspire components with one line each — service discovery, connection strings, and startup ordering are handled automatically.
- **Full observability** — OpenTelemetry tracing and structured logging across every component. When an MCP tool calls a database, then a cache, then an external API, you see the full distributed trace in the Aspire dashboard.
- **Dev/prod parity** — The same component definitions that run locally (containers for Redis, Postgres, etc.) map to real Azure resources when you deploy with `azd up`.
- **Production-ready structure** — The McpServer project deploys independently; the AppHost and Inspector are dev-time only.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) (or later)
- [Node.js](https://nodejs.org/) (required for the MCP Inspector; also required for TypeScript server)
- [.NET Aspire workload](https://learn.microsoft.com/dotnet/aspire/fundamentals/setup-tooling) or the [Aspire CLI](https://learn.microsoft.com/dotnet/aspire/fundamentals/aspire-cli)
- [Python 3.10+](https://www.python.org/) *(only if using `--McpLanguage python`)*

## Getting started

### Install the template

```bash
dotnet new install <path-to-this-template>/content
```

### Create a new project

```bash
dotnet new aspire-mcp -n MyMcpServer
cd MyMcpServer
```

### Run it

```bash
dotnet run --project MyMcpServer.AppHost
```

Or with the Aspire CLI:

```bash
aspire run
```

This starts the Aspire dashboard (typically at `https://localhost:17xxx`). From there you'll see two resources:

- **mcp-server** — Your MCP server
- **inspector** — The MCP Inspector web UI (click the endpoint link to open it)

The Inspector is pre-configured to connect to your server — just click **Connect** and start testing your tools.

### Adding your own tools

#### C#

Replace or extend the sample tool in `MyMcpServer.McpServer/Tools/RandomNumberTools.cs`:

```csharp
[McpServerTool]
[Description("Look up the current weather for a city.")]
public async Task<string> GetWeather(
    [Description("City name")] string city)
{
    // Your implementation here
}
```

Tools are auto-discovered — any class registered with `.WithTools<T>()` in `Program.cs` is available to MCP clients.

#### TypeScript

Add tools in `McpServer.TypeScript/src/index.ts`:

```typescript
server.registerTool("get_weather", {
  description: "Look up the current weather for a city.",
  inputSchema: { city: z.string().describe("City name") },
}, async ({ city }) => {
  return { content: [{ type: "text", text: `Weather for ${city}: sunny` }] };
});
```

#### Python

Add tools in `McpServer.Python/server.py`:

```python
@mcp.tool()
def get_weather(city: str) -> str:
    """Look up the current weather for a city."""
    return f"Weather for {city}: sunny"
```

## Configuration

### Inspector version

The template defaults to the latest Inspector version. To pin a specific version, set it via environment variable or app configuration:

```bash
# Environment variable
set MCP_INSPECTOR_VERSION=0.21.1
```

```json
// Or in appsettings.json (AppHost project)
{
  "McpInspector": {
    "Version": "0.21.1"
  }
}
```

## Deploying to Azure Container Apps

Only the **McpServer** project is deployed to production. The AppHost and Inspector are development tools and are not included in the deployment.

### 1. Initialize Azure Developer CLI

From the AppHost project directory:

```bash
cd MyMcpServer.AppHost
azd init
```

Select your Azure subscription and region when prompted. This generates the infrastructure-as-code (Bicep) for Azure Container Apps.

### 2. Deploy

```bash
azd up
```

This will:
- Build a container image of your MCP server
- Push it to an Azure Container Registry
- Deploy it to Azure Container Apps with HTTPS enabled
- Configure health checks using the `/health` endpoint

### 3. Verify

After deployment completes, `azd` prints the live URL. Test it:

```bash
curl -X POST https://your-app.azurecontainerapps.io/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### Production considerations

- **Authentication** — The template ships without auth. Add API key validation, OAuth, or Azure Entra ID before exposing publicly.
- **HTTPS** — Azure Container Apps provides TLS by default.
- **Scaling** — Configure min/max replicas in the ACA settings based on expected load.

## Publishing to the MCP Registry

The [MCP Registry](https://registry.modelcontextprotocol.io) is the official directory where developers and AI tools discover MCP servers. Publishing makes your server findable by anyone in the MCP ecosystem.

### 1. Package your server

First, publish your MCP server as a NuGet tool package:

```bash
cd MyMcpServer.McpServer
dotnet pack -c Release
dotnet nuget push bin/Release/*.nupkg --source https://api.nuget.org/v3/index.json --api-key YOUR_API_KEY
```

> **Tip:** For keyless publishing from GitHub Actions, consider [NuGet trusted publishing (OIDC)](https://learn.microsoft.com/nuget/nuget-org/publish-a-package#publish-with-trusted-publishers).

### 2. Create `server.json`

Install the publisher CLI and initialize the metadata file:

```bash
brew install mcp-publisher   # macOS/Linux
mcp-publisher init
```

This creates a `server.json` file. Edit it with your server's details:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
  "name": "io.github.yourname/my-mcp-server",
  "description": "Brief description of what your server does",
  "version": "1.0.0",
  "packages": [
    {
      "registry_type": "nuget",
      "identifier": "MyMcpServer",
      "version": "1.0.0"
    }
  ]
}
```

### 3. Validate and publish

```bash
mcp-publisher validate
mcp-publisher publish
```

You'll authenticate via GitHub OAuth when prompted. Once published, your server appears at `https://registry.modelcontextprotocol.io`.

For the full guide, see the [official MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart).

## Project structure

### C# (default)

```
MyMcpServer/
├── MyMcpServer.AppHost/           # Aspire orchestrator (dev-time only)
│   └── Program.cs                 # Wires MCP server + Inspector
├── MyMcpServer.McpServer/         # MCP server (deploys to production)
│   ├── Program.cs                 # Server setup + endpoint mapping
│   └── Tools/
│       └── RandomNumberTools.cs   # Sample MCP tool
├── MyMcpServer.ServiceDefaults/   # Shared Aspire service configuration
└── MyMcpServer.slnx               # Solution file
```

### TypeScript

```
MyMcpServer/
├── MyMcpServer.AppHost/           # Aspire orchestrator (dev-time only)
│   └── Program.cs                 # Wires MCP server + Inspector via AddNpmApp
└── McpServer.TypeScript/          # MCP server (Node.js)
    ├── package.json               # Dependencies
    ├── tsconfig.json              # TypeScript config
    └── src/
        └── index.ts               # Express server with MCP tools
```

### Python

```
MyMcpServer/
├── MyMcpServer.AppHost/           # Aspire orchestrator (dev-time only)
│   └── Program.cs                 # Wires MCP server + Inspector via AddPythonApp
└── McpServer.Python/              # MCP server (Python)
    ├── requirements.txt           # Dependencies
    └── server.py                  # FastMCP server with tools
```

## Learn more

- [Model Context Protocol specification](https://spec.modelcontextprotocol.io)
- [C# MCP SDK](https://github.com/modelcontextprotocol/csharp-sdk)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk)
- [.NET Aspire documentation](https://learn.microsoft.com/dotnet/aspire/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [CommunityToolkit.Aspire.Hosting.McpInspector](https://github.com/CommunityToolkit/Aspire)
