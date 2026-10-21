// Pantry Chef — a self-hosted MCP server (Streamable HTTP, JSON-RPC 2.0)
// plus a simulated Alexa+ web client. Zero dependencies: `node server.js`.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PROTOCOL_VERSION = "2025-11-25";
const DATA_FILE = path.join(__dirname, "data", "pantry.json");
const PUBLIC_DIR = path.join(__dirname, "public");

// ---------- Pantry state (persisted to data/pantry.json) ----------
function loadPantry() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return ["eggs", "rice", "onion", "garlic", "pasta", "tomato", "cheese", "butter"];
  }
}
function savePantry(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}
let pantry = loadPantry();

// ---------- Recipes ----------
const RECIPES = [
  { name: "Garlic butter pasta", needs: ["pasta", "garlic", "butter"], minutes: 15 },
  { name: "Tomato egg stir-fry", needs: ["eggs", "tomato", "onion"], minutes: 10 },
  { name: "Egg fried rice", needs: ["rice", "eggs", "onion"], minutes: 15 },
  { name: "Cheese omelette", needs: ["eggs", "cheese", "butter"], minutes: 8 },
  { name: "Pasta al pomodoro", needs: ["pasta", "tomato", "garlic", "onion"], minutes: 25 },
  { name: "Chicken rice bowl", needs: ["rice", "chicken", "garlic"], minutes: 25 },
  { name: "Veggie curry", needs: ["rice", "onion", "garlic", "coconut milk", "spinach"], minutes: 30 },
  { name: "Pancakes", needs: ["flour", "eggs", "milk", "butter"], minutes: 20 },
  { name: "Grilled cheese", needs: ["bread", "cheese", "butter"], minutes: 7 },
  { name: "Avocado toast", needs: ["bread", "avocado"], minutes: 5 },
];

const norm = (s) => String(s || "").trim().toLowerCase();

// ---------- MCP tool definitions ----------
const TOOLS = [
  {
    name: "list_pantry",
    description: "List every ingredient currently in the user's pantry.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "add_to_pantry",
    description: "Add one or more ingredients to the pantry.",
    inputSchema: {
      type: "object",
      properties: { items: { type: "array", items: { type: "string" }, description: "Ingredient names" } },
      required: ["items"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_from_pantry",
    description: "Remove ingredients from the pantry (e.g. when the user runs out).",
    inputSchema: {
      type: "object",
      properties: { items: { type: "array", items: { type: "string" } } },
      required: ["items"],
      additionalProperties: false,
    },
  },
  {
    name: "suggest_meals",
    description:
      "Suggest meals the user can cook right now from pantry contents. Returns recipes ranked by how many ingredients they already have, with the missing ones listed.",
    inputSchema: {
      type: "object",
      properties: {
        max_minutes: { type: "integer", description: "Only return recipes that take at most this many minutes." },
        limit: { type: "integer", description: "Max number of suggestions (default 3)." },
      },
      additionalProperties: false,
    },
  },
];

function callTool(name, args = {}) {
  switch (name) {
    case "list_pantry":
      return { items: pantry, count: pantry.length };
    case "add_to_pantry": {
      const added = [];
      for (const raw of args.items || []) {
        const it = norm(raw);
        if (it && !pantry.includes(it)) { pantry.push(it); added.push(it); }
      }
      savePantry(pantry);
      return { added, items: pantry };
    }
    case "remove_from_pantry": {
      const removed = [];
      for (const raw of args.items || []) {
        const it = norm(raw);
        if (pantry.includes(it)) { pantry = pantry.filter((p) => p !== it); removed.push(it); }
      }
      savePantry(pantry);
      return { removed, items: pantry };
    }
    case "suggest_meals": {
      const limit = Number(args.limit) > 0 ? Number(args.limit) : 3;
      const maxMin = Number(args.max_minutes) > 0 ? Number(args.max_minutes) : Infinity;
      const ranked = RECIPES.filter((r) => r.minutes <= maxMin)
        .map((r) => {
          const missing = r.needs.filter((n) => !pantry.includes(n));
          return { name: r.name, minutes: r.minutes, have: r.needs.length - missing.length, needs: r.needs, missing };
        })
        .sort((a, b) => a.missing.length - b.missing.length || a.minutes - b.minutes)
        .slice(0, limit);
      return { suggestions: ranked, ready_now: ranked.filter((r) => r.missing.length === 0).map((r) => r.name) };
    }
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  }
}

// ---------- JSON-RPC / MCP handling ----------
function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }

function handleMessage(msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg && msg.id, -32600, "Invalid Request");
  }
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "pantry-chef", version: "1.0.0" },
        instructions: "Pantry Chef keeps track of what is in the user's kitchen and suggests meals they can cook right now.",
      });
    case "notifications/initialized":
      return null; // notification, no response
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      try {
        const data = callTool(params.name, params.arguments || {});
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(data) }],
          structuredContent: data,
          isError: false,
        });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: e.message }], isError: true });
      }
    }
    default:
      return isNotification ? null : rpcError(id, -32601, `Method not found: ${method}`);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const sessions = new Set();

async function handleMcp(req, res) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  if (req.method === "DELETE") {
    sessions.delete(req.headers["mcp-session-id"]);
    res.writeHead(204, cors); return res.end();
  }
  if (req.method === "GET") {
    // Server-initiated SSE stream is optional in Streamable HTTP; we don't push messages.
    res.writeHead(405, { ...cors, Allow: "POST, DELETE" }); return res.end();
  }
  if (req.method !== "POST") { res.writeHead(405, cors); return res.end(); }

  let parsed;
  try { parsed = JSON.parse(await readBody(req)); }
  catch { res.writeHead(400, { ...cors, "Content-Type": "application/json" }); return res.end(JSON.stringify(rpcError(null, -32700, "Parse error"))); }

  const batch = Array.isArray(parsed) ? parsed : [parsed];
  const responses = batch.map(handleMessage).filter(Boolean);
  const headers = { ...cors, "Content-Type": "application/json" };

  const init = batch.find((m) => m && m.method === "initialize");
  if (init) {
    const sid = crypto.randomUUID();
    sessions.add(sid);
    headers["Mcp-Session-Id"] = sid;
  }

  if (responses.length === 0) { res.writeHead(202, cors); return res.end(); }
  res.writeHead(200, headers);
  res.end(JSON.stringify(Array.isArray(parsed) ? responses : responses[0]));
}

// ---------- Static files for the Alexa+ simulator ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
function serveStatic(req, res) {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const file = path.join(PUBLIC_DIR, path.normalize(p));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  if (req.url.startsWith("/mcp")) return handleMcp(req, res);
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Pantry Chef MCP server:   http://localhost:${PORT}/mcp`);
  console.log(`Alexa+ simulator (web):   http://localhost:${PORT}/`);
});
