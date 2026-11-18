import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://dueey.com/api/v1";

/** Per-request API key (HTTP mode). Falls back to DUEEY_API_KEY (stdio mode). */
export const apiKeyStore = new AsyncLocalStorage<string>();
const getApiKey = () => apiKeyStore.getStore() ?? process.env.DUEEY_API_KEY ?? "";

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
      Authorization: `Bearer ${getApiKey()}`,
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

export function createServer(): Server {
const server = new Server(
  { name: "dueey-mcp", version: "1.2.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Dueey project-management tools. If at any point what you or the user want to do is not possible with these tools (a missing tool, missing field, unsupported operation, or a tool that errors or behaves unexpectedly), do not silently work around it or give up: call `report_feedback` with a short, specific description of the gap, then tell the user what you reported.",
  }
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

    // Workspaces
    {
      name: "list_workspaces",
      description: "List the workspaces the user can access (id, name, icon). Use the id as `workspaceId` for list_boards / create_board.",
      inputSchema: { type: "object", properties: {} },
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
    {
      name: "create_board",
      description:
        "Create a brand-new board (project) in a workspace. Creates default lists (To Do / Doing / Done) unless `lists` is passed (pass `lists: []` for no lists).",
      inputSchema: {
        type: "object",
        required: ["workspaceId", "title"],
        properties: {
          workspaceId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          goal: { type: "string", description: "What this board/project is trying to achieve — used as AI context." },
          cardKeyPrefix: { type: "string", description: "2-12 uppercase alphanumeric chars, e.g. SWAT. Derived from title if omitted." },
          lists: {
            type: "array",
            items: { type: "string" },
            description: "List titles to create, in order. Defaults to ['To Do', 'Doing', 'Done'].",
          },
        },
      },
    },
    {
      name: "update_board",
      description:
        "Update a board's title, description, goal, or projectDescription. Structural fields (visibility, cardKeyPrefix, workspaceId) are intentionally not editable via this API.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Board ID" },
          title: { type: "string" },
          description: { type: "string" },
          goal: { type: "string", description: "What this board/project is trying to achieve — used as AI context." },
          projectDescription: { type: "string" },
        },
      },
    },

    {
      name: "list_board_members",
      description: "List people who can be assigned on a board (id, email, name). Use before assigning so you pass a valid member.",
      inputSchema: {
        type: "object",
        required: ["boardId"],
        properties: { boardId: { type: "string", description: "Board ID" } },
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
    {
      name: "create_list",
      description: "Create a new list (column) on a board.",
      inputSchema: {
        type: "object",
        required: ["boardId", "title"],
        properties: {
          boardId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          position: { type: "number", description: "Defaults to the end of the board." },
        },
      },
    },
    {
      name: "update_list",
      description: "Rename, reorder, or archive/restore a list. Pass only the fields you want to change.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "List ID" },
          title: { type: "string" },
          description: { type: "string" },
          position: { type: "number" },
          deletedAt: {
            type: "string",
            nullable: true,
            description: "Set an ISO timestamp to archive the list, or null to restore it.",
          },
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
          unassigned: { type: "boolean", description: "Only return cards with no assignee." },
          fields: { type: "string" },
        },
      },
    },
    {
      name: "search_cards",
      description:
        "Search cards across ALL boards (or narrow with boardId/listId). Text `q` matches title, description and card key (e.g. 'SWAT-42'); combine with filters, which are ANDed. Prefer this over list_cards + scanning when looking for something specific.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Case-insensitive text to find in title, description or card key." },
          boardId: { type: "string" },
          listId: { type: "string" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low", "none"] },
          label: { type: "string" },
          assignee: { type: "string", description: "Exact assignee name as stored on the card." },
          overdue: { type: "boolean", description: "Only cards past their due date and not completed." },
          dueBefore: { type: "string", description: "ISO date/time upper bound for dueDate." },
          dueAfter: { type: "string", description: "ISO date/time lower bound for dueDate." },
          completed: { type: "boolean", description: "true = only completed, false = only not completed." },
          limit: { type: "number", description: "Max results (default 50, max 200)" },
          fields: { type: "string" },
        },
      },
    },
    {
      name: "move_card",
      description:
        "Move a card to another list (possibly on another board you can access) and/or reorder it within its list. Position defaults to the bottom of the target list.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          listId: { type: "string", description: "Target list. Omit to reorder within the current list." },
          position: {
            oneOf: [{ type: "number" }, { type: "string", enum: ["top", "bottom"] }],
            description: "'top' or 'bottom' (default 'bottom').",
          },
        },
      },
    },
    {
      name: "set_checklist_item",
      description:
        "Check or uncheck ONE checklist item on a card without resending the whole checklist. Identify the item by 0-based `index` or by `text` (case-insensitive exact match).",
      inputSchema: {
        type: "object",
        required: ["id", "completed"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          index: { type: "number", description: "0-based position in the checklist" },
          text: { type: "string", description: "Item text, if index not given" },
          completed: { type: "boolean" },
        },
      },
    },
    {
      name: "archive_card",
      description:
        "Archive (soft-delete) a card. It disappears from boards and default listings but can be brought back with restore_card. Prefer this over any destructive action; confirm with the user before archiving cards they did not ask you to remove.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", description: "Card UUID or cardKey" } },
      },
    },
    {
      name: "restore_card",
      description: "Restore a previously archived card.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", description: "Card UUID or cardKey" } },
      },
    },
    {
      name: "claim_next_card",
      description:
        "Atomically claim the next unassigned card for an agent, ordered by board position, list position, then AI rank — so parallel agents don't grab the same card. Sets members/assignee to agentId.",
      inputSchema: {
        type: "object",
        required: ["agentId"],
        properties: {
          agentId: { type: "string", description: "Identifier for the claiming agent (1-120 printable ASCII chars)." },
          boardId: { type: "string", description: "Restrict claim to this board." },
          listId: { type: "string", description: "Restrict claim to this list (overrides boardId scope to that list's board)." },
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
          members: { type: "array", items: { type: "string" }, description: "Assignee(s) — user id/email or agent id." },
        },
      },
    },
    {
      name: "link_card",
      description: "Link a card to another card as blocking or blocked-by it (a dependency relationship).",
      inputSchema: {
        type: "object",
        required: ["id", "cardId", "type"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          cardId: { type: "string", description: "The other card's UUID or cardKey" },
          type: { type: "string", enum: ["blocks", "blocked_by"] },
          reason: { type: "string" },
        },
      },
    },
    {
      name: "unlink_card",
      description: "Remove a blocks/blocked_by link between two cards.",
      inputSchema: {
        type: "object",
        required: ["id", "cardId", "type"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          cardId: { type: "string", description: "The other card's UUID or cardKey to unlink" },
          type: { type: "string", enum: ["blocks", "blocked_by"] },
        },
      },
    },
    {
      name: "add_comment",
      description: "Add a simple text comment to a card.",
      inputSchema: {
        type: "object",
        required: ["id", "text"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          text: { type: "string" },
          authorName: { type: "string", description: "Defaults to the authenticated user; override for agent-attributed comments, e.g. 'Claude Code agent'." },
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
          members: { type: "array", items: { type: "string" }, description: "Assignee(s) — user id/email or agent id. Pass [] to unassign." },
          assignee: { type: "string", nullable: true, description: "Shorthand for a single assignee; ignored if members is also passed." },
          acceptanceCriteria: {
            type: "array",
            items: { type: "string" },
            description: "What 'done' means for this card, as a list of concrete statements.",
          },
          technicalNotes: {
            type: "string",
            description: "Implementation notes: files/patterns to reuse, approach, gotchas.",
          },
          effortEstimate: {
            type: "string",
            enum: ["XS", "S", "M", "L", "XL"],
            nullable: true,
          },
          fileHints: {
            type: "array",
            items: { type: "string" },
            description: "Repo paths relevant to this card, e.g. src/components/ui/chart.tsx.",
          },
          position: {
            oneOf: [{ type: "number" }, { type: "string", enum: ["top", "bottom"] }],
            description: "Sort position within its list — 'top'/'bottom' to move to an end (recommended), or a raw number (advanced; no auto-reindex of siblings).",
          },
          color: { type: "string", nullable: true },
          cover: { type: "string", nullable: true },
          coverTitle: { type: "string", nullable: true },
          coverDescription: { type: "string", nullable: true },
          deletedAt: {
            type: "string",
            nullable: true,
            description: "Set an ISO timestamp to archive the card, or null to restore it.",
          },
          agentStatus: {
            type: "string",
            nullable: true,
            enum: ["idle", "queued", "dispatched", "in_progress", "pr_ready", "done", "failed"],
            description: "Self-report an agent's progress on this card.",
          },
          agentTarget: {
            type: "string",
            nullable: true,
            enum: ["claude-code", "codex", "cursor", "api"],
          },
          agentBranch: { type: "string", nullable: true },
          agentPrUrl: { type: "string", nullable: true },
        },
      },
    },

    // Context
    {
      name: "get_card_context",
      description:
        "Get a card plus its board (title/goal) and sibling cards on the same board in one call — grounding context for fleshing out or triaging a card without multiple round trips.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Card UUID or cardKey" },
          siblingLimit: { type: "number", description: "Max sibling cards to include (default 50)" },
        },
      },
    },

    // Feedback
    {
      name: "report_feedback",
      description:
        "Send feedback to the Dueey team. Call this PROACTIVELY, without waiting to be asked, whenever you are using Dueey and what you (or the user) want to do is NOT available: no tool or field exists for it, an operation is unsupported, a tool errors or returns something unexpected, or the tool descriptions were misleading. Describe the gap concretely: what you tried to do, which tool(s) you used, and what was missing or went wrong. Also use it when the user explicitly wants to report a bug or suggest an improvement. Tell the user briefly that you sent it. Do not include secrets or unrelated personal data.",
      inputSchema: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", description: "What you tried to do and what was missing or went wrong (max 4000 chars)." },
          feedbackType: {
            type: "string",
            enum: ["bug", "feature_request", "improvement", "question", "other"],
            description: "Defaults to feature_request. Use bug for errors or unexpected behavior.",
          },
          toolName: { type: "string", description: "The Dueey tool this relates to, if any." },
          boardId: { type: "string", description: "Related board ID, if any." },
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

    case "create_board": {
      const { ...body } = args;
      return ok(
        await dueeyFetch("/boards", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

    case "update_board": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/boards/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    }

    case "list_lists":
      return ok(
        await dueeyFetch("/lists", {
          params: { boardId: args.boardId as string, fields: args.fields as string },
        })
      );

    case "create_list": {
      const { ...body } = args;
      return ok(
        await dueeyFetch("/lists", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

    case "update_list": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    }

    case "list_cards":
      return ok(
        await dueeyFetch("/cards", {
          params: {
            boardId: args.boardId as string,
            listId: args.listId as string,
            limit: args.limit as number,
            unassigned: args.unassigned ? "1" : undefined,
            fields: args.fields as string,
          },
        })
      );

    case "search_cards": {
      const { overdue, completed, ...rest } = args;
      return ok(
        await dueeyFetch("/cards", {
          params: {
            ...(rest as Record<string, string | number | undefined>),
            overdue: overdue ? "1" : undefined,
            completed: completed === undefined ? undefined : completed ? "1" : "0",
          },
        })
      );
    }

    case "move_card": {
      const { id, listId, position } = args as { id: string; listId?: string; position?: unknown };
      return ok(
        await dueeyFetch(`/cards/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ listId, position: position ?? "bottom" }),
        })
      );
    }

    case "archive_card":
      return ok(
        await dueeyFetch(`/cards/${args.id}`, {
          method: "PATCH",
          body: JSON.stringify({ deletedAt: new Date().toISOString() }),
        })
      );

    case "restore_card":
      return ok(
        await dueeyFetch(`/cards/${args.id}`, {
          method: "PATCH",
          body: JSON.stringify({ deletedAt: null }),
        })
      );

    case "list_board_members":
      return ok(await dueeyFetch(`/boards/${args.boardId}/members`, {}));

    case "set_checklist_item": {
      const { id, index, text, completed } = args as { id: string; index?: number; text?: string; completed: boolean };
      const card = (await dueeyFetch(`/cards/${id}`, { params: { fields: "id,checklist" } })) as {
        checklist?: Array<{ text: string; completed: boolean }>;
      };
      const checklist = card.checklist ?? [];
      const i =
        typeof index === "number"
          ? index
          : checklist.findIndex((c) => c.text.trim().toLowerCase() === String(text ?? "").trim().toLowerCase());
      if (!Number.isInteger(i) || i < 0 || i >= checklist.length) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Checklist item not found. Checklist: ${JSON.stringify(checklist.map((c, n) => `${n}: ${c.text}`))}`
        );
      }
      const next = checklist.map((c, n) => (n === i ? { ...c, completed } : c));
      return ok(
        await dueeyFetch(`/cards/${id}`, { method: "PATCH", body: JSON.stringify({ checklist: next }) })
      );
    }

    case "list_workspaces":
      return ok(await dueeyFetch("/workspaces", {}));

    case "claim_next_card": {
      const { ...body } = args;
      return ok(
        await dueeyFetch("/cards/claim-next", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

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

    case "link_card": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/cards/${id}/links`, {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

    case "unlink_card": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/cards/${id}/links`, {
          method: "DELETE",
          body: JSON.stringify(body),
        })
      );
    }

    case "add_comment": {
      const { id, ...body } = args as { id: string; [k: string]: unknown };
      return ok(
        await dueeyFetch(`/cards/${id}/comments`, {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    }

    case "get_card_context": {
      const card = (await dueeyFetch(`/cards/${args.id}`, {})) as Record<string, unknown>;
      const boardId = card.boardId as string | undefined;
      if (!boardId) {
        return ok({ card, board: null, siblingCards: [] });
      }
      const [board, siblingCards] = await Promise.all([
        dueeyFetch(`/boards/${boardId}`, {}),
        dueeyFetch("/cards", {
          params: { boardId, limit: (args.siblingLimit as number) ?? 50 },
        }),
      ]);
      return ok({ card, board, siblingCards });
    }

    case "report_feedback":
      return ok(
        await dueeyFetch("/feedback", {
          method: "POST",
          body: JSON.stringify({ ...args, clientName: "dueey-mcp" }),
        })
      );

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

return server;
}
