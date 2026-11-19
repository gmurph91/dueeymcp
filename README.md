# Dueey MCP Server

MCP server for the [Dueey](https://dueey.com) PM Assistant public API.  
Exposes boards, lists, cards, and exports as MCP tools for Claude and other AI clients.

## Setup

### Option A: Install from npm

```bash
npm install -g dueey-mcp
# or use with npx: npx dueey-mcp
```

### Option B: Install from source

```bash
npm install
npm run build
```

### 2. Get your API key

In Dueey: **Settings → API Access** → generate a token (starts with `pm_...`).

### 3. Add to your AI client

### Remote / Claude Code cloud (https://dueey.com/mcp)

The same tools are served over Streamable HTTP (`npm run build && npm run start:http`, port 3002, path `/mcp`).
Authenticate with your Dueey token as a bearer header. In a repo's `.mcp.json`:

```json
{
  "mcpServers": {
    "dueey": {
      "type": "http",
      "url": "https://dueey.com/mcp",
      "headers": { "Authorization": "Bearer ${DUEEY_API_KEY}" }
    }
  }
}
```

Set `DUEEY_API_KEY` as an environment variable on your Claude Code cloud environment. Or run
`claude mcp add --transport http dueey https://dueey.com/mcp --header "Authorization: Bearer pm_..."`.
For claude.ai: Settings → Connectors → Add custom connector → `https://dueey.com/mcp`. It signs you in via Dueey's OAuth consent page and issues a revocable API token.

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or  
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "dueey": {
      "command": "npx",
      "args": ["-y", "dueey-mcp@latest"],
      "env": {
        "DUEEY_API_KEY": "pm_your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop.

#### Cursor

Add the server in **Cursor Settings → Features → MCP** (or your project’s `.cursor/mcp.json`). Example:

```json
{
  "mcpServers": {
    "dueey": {
      "command": "npx",
      "args": ["-y", "dueey-mcp@latest"],
      "env": {
        "DUEEY_API_KEY": "pm_your_token_here"
      }
    }
  }
}
```

#### Other clients

Any client that supports MCP over stdio (e.g. Windsurf, Continue, custom setups) can use this server: run `node /path/to/dist/index.js` with `DUEEY_API_KEY` set in the environment and point the client at that process. Set `DUEEY_API_URL` to target a different API base (default `https://dueey.com/api/v1`).

---

## Available Tools

| Tool | Description |
|------|-------------|
| `get_me` | Current authenticated user |
| `list_boards` | All boards (optional `workspaceId` filter); includes `repositoryUrl` when set |
| `get_board` | Single board by ID or slug; includes `repositoryUrl` when set |
| `list_labels` | Label names available on a board (with color); pass them in `labels` on `create_card`/`update_card` |
| `list_lists` | Lists/columns for a board (includes `role`); `create_list` / `update_list` accept `role`: `backlog` \| `up_next` \| `needs_me` \| `done` |
| `list_cards` | Cards filtered by board or list |
| `get_card` | Single card by UUID or cardKey (e.g. `SWAT-42`) |
| `create_card` | Create a card with title, description, priority, labels (by name; unknown names are auto-created on the board), dates, checklist |
| `update_card` | Update any card field; use `listId` to move a card. Agent fields: `agentStatus` (incl. `needs_input`), `agentQuestion`, `agentSessionId`, `agentSession` (upsert into the capped session history) |
| `list_workspaces` | Workspaces you can access (IDs for `list_boards` / `create_board`) |
| `search_cards` | Search all boards by text, priority, label, assignee, due date, overdue, completed |
| `query_cards` | Cross-board query in one call: filter by `agentStatus`, `listRole`, `listId`, `boardId`, `labels`, `updatedSince`; cursor-paginated (`{cards, nextCursor}`); cards include `boardId` and `listRole` |
| `get_boards_summary` | Every board with `repositoryUrl` and its lists (`id`, `title`, `role`, `cardCount`) in one call |
| `move_card` | Move a card to another list and/or reorder it (`top` / `bottom`) |
| `archive_card` / `restore_card` | Soft-delete a card and bring it back |
| `list_board_members` | Assignable people on a board (id, email, name) |
| `set_checklist_item` | Check/uncheck one checklist item by index or text |
| `get_card_context` | Card + board (title/goal) + sibling cards. Siblings are compact (`id`, `cardKey`, `title`, `priority`, `labels`, `listId`, `assignee`, `dueDate`, `agentStatus`) and capped by `siblingLimit` (default 50, `0` = none); use `get_card` for full detail |
| `report_feedback` | Send feedback to the Dueey team. The AI is prompted to call it whenever something it needs isn't available |
| `get_data` | Full export — all workspaces, boards, lists, cards |

---

## Example prompts

- *"Show me all my Dueey boards"*
- *"List the cards in my Roadmap board"*
- *"Create a high-priority card called 'Fix login bug' in my Backlog list"*
- *"Move card SWAT-12 to the Done column"*
- *"Export all my data from Dueey"*
