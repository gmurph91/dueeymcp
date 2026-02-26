#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://dueey.com/api/v1";
const API_KEY = process.env.DUEEY_API_KEY ?? "";

if (!API_KEY) {
  console.error("Error: DUEEY_API_KEY environment variable is required.");
  process.exit(1);
}

async function dueeyFetch(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
) {
  const { params, ...fetchOptions } = options;
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(fetchOptions.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new McpError(
      ErrorCode.InternalError,
      `Dueey API error ${res.status}: ${text || res.statusText}`
    );
  }

  return res.json();
}

const server = new Server(
  { name: "dueey-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // User
    {
      name: "get_me",
      description: "Get the currently authenticated Dueey user (id, email, name).",
      inputSchema: { type: "object", properties: {}, required: [] },
    },

    // Boards
    {
      name: "list_boards",
      description: "List all boards the user has access to, optionally filtered by workspace.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Filter by workspace ID" },
          fields: { type: "string", description: "Comma-separated fields to return" },
        },
      },
    },
    {
      name: "get_board",
      description: "Get full details for a single board by its ID or slug.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Board ID or slug" },
          fields: { type: "string" },
        },
      },
    },

    // Lists
    {
      name: "list_lists",
      description: "Get all lists (columns) for a specific board.",
      inputSchema: {
        type: "object",
        required: ["boardId"],
        properties: {
          boardId: { type: "string", description: "Board ID" },
          fields: { type: "string" },
        },
      },
    },

    // Cards
    {
      name: "list_cards",
      description:
        "List cards, optionally filtered by board or list. Returns up to `limit` cards (default 50).",
      inputSchema: {
        type: "object",
        properties: {
          boardId: { type: "string" },
          listId: { type: "string" },
          limit: { type: "number", description: "Max results (default 50)" },
          fields: { type: "string" },
        },
      },
    },
    {
      name: "get_card",
      description: "Get a single card by its UUID or cardKey (e.g. SWAT-42).",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          fields: { type: "string" },
        },
      },
    },
    {
      name: "create_card",
      description: "Create a new card in a list.",
      inputSchema: {
        type: "object",
        required: ["listId", "title"],
        properties: {
          listId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "none"],
          },
          labels: { type: "array", items: { type: "string" } },
          dueDate: { type: "string", description: "ISO date e.g. 2025-12-31" },
          startDate: { type: "string" },
          checklist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                completed: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    {
      name: "update_card",
      description:
        "Update an existing card. Pass only the fields you want to change. Use `listId` to move a card to another list.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          title: { type: "string" },
          description: { type: "string" },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "none"],
          },
          labels: { type: "array", items: { type: "string" } },
          dueDate: { type: "string", nullable: true },
          startDate: { type: "string", nullable: true },
          checklist: { type: "array" },
          listId: { type: "string", description: "Move card to this list" },
        },
      },
    },

    // Export
    {
      name: "get_data",
      description:
        "Full export of all workspaces, boards, lists, and cards keyed by ID. Use `compact=true` to omit nulls and heavy fields.",
      inputSchema: {
        type: "object",
        properties: {
          compact: { type: "boolean" },
        },
      },
    },
  ],
}));

// ─── Tool Handlers ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const ok = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  });

  switch (name) {
    case "get_me":
      return ok(await dueeyFetch("/me"));

    case "list_boards":
      return ok(
        await dueeyFetch("/boards", {
          params: { workspaceId: args.workspaceId as string, fields: args.fields as string },
        })
      );

    case "get_board":
      return ok(
        await dueeyFetch(`/boards/${args.id}`, {
          params: { fields: args.fields as string },
        })
      );

    case "list_lists":
      return ok(
        await dueeyFetch("/lists", {
          params: { boardId: args.boardId as string, fields: args.fields as string },
        })
      );

    case "list_cards":
      return ok(
        await dueeyFetch("/cards", {
          params: {
            boardId: args.boardId as string,
            listId: args.listId as string,
            limit: args.limit as number,
            fields: args.fields as string,
          },
        })
      );

    case "get_card":
      return ok(
        await dueeyFetch(`/cards/${args.id}`, {
          params: { fields: args.fields as string },
        })
      );

    case "create_card": {
      const { ...body } = args;
      return ok(
        await dueeyFetch("/cards", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

    case "update_card": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/cards/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    }

    case "get_data":
      return ok(
        await dueeyFetch("/data", {
          params: { compact: args.compact ? "1" : undefined },
        })
      );

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport);
console.error("Dueey MCP server running.");
