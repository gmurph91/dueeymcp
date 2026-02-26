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

Any client that supports MCP over stdio (e.g. Windsurf, Continue, custom setups) can use this server: run `node /path/to/dist/index.js` with `DUEEY_API_KEY` set in the environment and point the client at that process.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `get_me` | Current authenticated user |
| `list_boards` | All boards (optional `workspaceId` filter) |
| `get_board` | Single board by ID or slug |
| `list_lists` | Lists/columns for a board |
| `list_cards` | Cards filtered by board or list |
| `get_card` | Single card by UUID or cardKey (e.g. `SWAT-42`) |
| `create_card` | Create a card with title, description, priority, labels, dates, checklist |
| `update_card` | Update any card field; use `listId` to move a card |
| `get_data` | Full export — all workspaces, boards, lists, cards |

---

## Example prompts

- *"Show me all my Dueey boards"*
- *"List the cards in my Roadmap board"*
- *"Create a high-priority card called 'Fix login bug' in my Backlog list"*
- *"Move card SWAT-12 to the Done column"*
- *"Export all my data from Dueey"*
