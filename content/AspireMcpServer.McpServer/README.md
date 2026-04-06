# MCP Server

This MCP server was created using the Aspire MCP Server template.
It uses the [MCP C# SDK](https://modelcontextprotocol.github.io/csharp-sdk) with HTTP transport, integrated into .NET Aspire with the MCP Inspector for testing.

## Getting Started

Run the Aspire AppHost to start both the MCP server and Inspector:

```bash
dotnet run --project AspireMcpServer.AppHost
```

The Aspire dashboard will show:
- **mcp-server** — Your MCP server (HTTP transport)
- **mcp-inspector** — Web UI for testing MCP tools interactively

## Developing locally

To connect to this MCP server from your IDE (without Aspire), configure it as an HTTP server:

```json
{
  "servers": {
    "AspireMcpServer": {
      "type": "http",
      "url": "http://localhost:5200"
    }
  }
}
```

Refer to the VS Code or Visual Studio documentation for more information:

- [Use MCP servers in VS Code (Preview)](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
- [Use MCP servers in Visual Studio (Preview)](https://learn.microsoft.com/visualstudio/ide/mcp-servers)

## Testing the MCP Server

Once configured, you can ask Copilot Chat for a random number, for example, `Give me 3 random numbers`. It should prompt you to use the `get_random_number` tool on the MCP server and show you the results.

## More information

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP C# SDK](https://modelcontextprotocol.github.io/csharp-sdk)
- [.NET Aspire](https://learn.microsoft.com/dotnet/aspire)
