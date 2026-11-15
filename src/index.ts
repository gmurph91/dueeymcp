#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

if (!process.env.DUEEY_API_KEY) {
  console.error("Error: DUEEY_API_KEY environment variable is required.");
  process.exit(1);
}

await createServer().connect(new StdioServerTransport());
console.error("Dueey MCP server running.");
