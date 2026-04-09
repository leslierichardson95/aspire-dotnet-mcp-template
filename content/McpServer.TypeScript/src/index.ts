import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response, NextFunction } from "express";
import * as z from "zod/v4";

// Factory — each session needs its own McpServer instance because the SDK
// binds one transport per server.
function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-server", version: "1.0.0" });

  server.registerTool(
    "get_random_number",
    {
      description:
        "Generates a random number between the specified minimum and maximum values.",
      inputSchema: {
        min: z.number().int().default(0).describe("Minimum value (inclusive)"),
        max: z
          .number()
          .int()
          .default(100)
          .describe("Maximum value (exclusive)"),
      },
    },
    async ({ min, max }) => {
      const result = Math.floor(Math.random() * (max - min)) + min;
      return { content: [{ type: "text", text: String(result) }] };
    }
  );

  return server;
}

const app = createMcpExpressApp({ host: "0.0.0.0" });

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

// Session-based transport map — the Inspector needs sessions to open SSE
// streams for server-initiated messages.
const sessions = new Map<
  string,
  { server: McpServer; transport: StreamableHTTPServerTransport }
>();

app.post("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session — create a fresh server + transport pair.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  const server = createServer();

  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  if (transport.sessionId) {
    sessions.set(transport.sessionId, { server, transport });
  }
});

app.get("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }
  // No session — the MCP spec says return 405 so clients know GET-based
  // notification streams are only available after a session is created.
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/event-stream")) {
    res.status(405).set("Allow", "POST, DELETE").end();
    return;
  }
  // Plain browser probe — return a friendly message.
  res.json({
    name: "mcp-server",
    version: "1.0.0",
    protocol: "MCP Streamable HTTP",
    hint: "POST to this URL with a JSON-RPC initialize request to start a session.",
  });
});

app.delete("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
    sessions.delete(sessionId);
    return;
  }
  res.status(400).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Invalid or missing session ID" },
    id: null,
  });
});

const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP server listening on http://0.0.0.0:${port}`);
});
