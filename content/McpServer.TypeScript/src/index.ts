import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import * as z from "zod/v4";

const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Sample tool — generates a random number between min and max.
server.registerTool(
  "get_random_number",
  {
    description:
      "Generates a random number between the specified minimum and maximum values.",
    inputSchema: {
      min: z.number().int().default(0).describe("Minimum value (inclusive)"),
      max: z.number().int().default(100).describe("Maximum value (exclusive)"),
    },
  },
  async ({ min, max }) => {
    const result = Math.floor(Math.random() * (max - min)) + min;
    return { content: [{ type: "text", text: String(result) }] };
  }
);

const app = createMcpExpressApp();

// Health check endpoint for Aspire orchestration.
app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// MCP endpoint — clients connect here to discover and invoke tools.
app.post("/", async (req, res) => {
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP server listening on http://0.0.0.0:${port}`);
});
