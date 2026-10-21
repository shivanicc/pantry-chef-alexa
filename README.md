# Pantry Chef — an Alexa+ MCP server that knows what's in your kitchen

Pantry Chef is a self-hosted **MCP server** (Model Context Protocol, Streamable HTTP transport, protocol version `2025-11-25`) that keeps track of the ingredients in your pantry and suggests meals you can cook right now. It ships with a **simulated Alexa+ web experience** so you can talk to it in plain English and watch the real MCP tool calls happen underneath.

Built for the Amazon Developer Hackathon 2026, **Alexa+ track**.

## What it does

Ask things like:

- "Alexa, what's in my pantry?"
- "What can I cook tonight?"
- "Something quick, under 10 minutes"
- "Add bread and avocado"
- "We're out of eggs"

The simulated Alexa+ client maps the utterance to one of four MCP tools and reads the structured result back to you.

| MCP tool | What it does |
|---|---|
| `list_pantry` | Returns every ingredient in the pantry |
| `add_to_pantry` | Adds ingredients (`items: string[]`) |
| `remove_from_pantry` | Removes ingredients you've run out of |
| `suggest_meals` | Ranks recipes by how many ingredients you already have; optional `max_minutes` and `limit` |

Pantry state persists to `data/pantry.json`.

## Run it

Requires Node 18+. No dependencies to install.

```bash
git clone https://github.com/shivanicc/pantry-chef-alexa
cd pantry-chef-alexa
node server.js
```

Then open <http://localhost:3000/> for the Alexa+ simulator.
The MCP endpoint is <http://localhost:3000/mcp>.

## Talk to the MCP server directly

```bash
# initialize (note the Mcp-Session-Id response header)
curl -i -X POST localhost:3000/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

# list tools
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# call a tool
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"suggest_meals","arguments":{"max_minutes":15}}}'
```

It also works with any MCP client that supports Streamable HTTP (for example, the MCP Inspector: `npx @modelcontextprotocol/inspector`, transport "Streamable HTTP", URL `http://localhost:3000/mcp`).

## How it's built

- `server.js` — a dependency-free Node HTTP server. `POST /mcp` handles JSON-RPC 2.0 messages (`initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`), issues an `Mcp-Session-Id`, returns `structuredContent` alongside text content, and answers notifications with `202`. Everything else is served as static files.
- `public/index.html` — the simulated Alexa+ experience. A tiny intent matcher turns an utterance into a `tools/call`, then phrases the structured result the way a voice assistant would. The side panel shows the live tool list from `tools/list` and the last raw JSON-RPC request/response so judges can see the protocol in action.
- `data/pantry.json` — pantry state (created on first write).

## Why MCP

Alexa+ integrations are powered by MCP, so the same server that drives this simulator is the shape of what a real Alexa+ skill partner would host. The simulator exists so the experience can be demoed without Preview access.

## License

MIT
