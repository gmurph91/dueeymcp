#!/usr/bin/env node
/**
 * Remote (Streamable HTTP) entry point, served at /mcp.
 * Stateless: each request carries `Authorization: Bearer pm_...`, which is
 * forwarded to the Dueey API. No key is stored on the server.
 */
import { createServer as createHttpServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { apiKeyStore, createServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3002);
const PATH = process.env.MCP_PATH ?? "/mcp";

function send(res: import("node:http").ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 1_000_000) throw new Error("Body too large");
    chunks.push(c as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
}

createHttpServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health") return send(res, 200, { ok: true });
  if (url.pathname !== PATH) return send(res, 404, { error: "Not found" });

  if (req.method !== "POST") {
    return send(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }, { Allow: "POST" });
  }

  const m = /^Bearer\s+(pm_\S+)$/i.exec(req.headers.authorization ?? "");
  if (!m) {
    return send(res, 401, { error: "Missing or invalid Authorization: Bearer pm_... token" }, {
      "WWW-Authenticate": 'Bearer realm="dueey"',
    });
  }

  try {
    const body = await readJson(req);
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await apiKeyStore.run(m[1], () => transport.handleRequest(req, res, body));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
}).listen(PORT, () => console.error(`Dueey MCP HTTP server on :${PORT}${PATH}`));
