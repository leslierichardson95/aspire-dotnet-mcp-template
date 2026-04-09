import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response, NextFunction } from "express";
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

// CORS — required so the MCP Inspector (different origin) can reach this server.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, mcp-session-id"
  );
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Health check endpoint for Aspire orchestration.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

// MCP endpoint — clients POST here to discover and invoke tools.
app.post("/", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// GET / — stateless server does not support SSE streams.
app.get("/", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed (stateless mode)" },
    id: null,
  });
});

// DELETE / — stateless server has no sessions to terminate.
app.delete("/", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed (stateless mode)" },
    id: null,
  });
});

const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP server listening on http://0.0.0.0:${port}`);
});
