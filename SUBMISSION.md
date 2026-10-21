# Devpost submission answers — copy/paste

## Project name
Pantry Chef for Alexa+

## Elevator pitch (≤200 chars)
An MCP server Alexa+ can call to track what's in your kitchen and tell you what you can cook right now, with a simulated Alexa+ web experience to try it.

## Project story ("About the project")

## Inspiration
The question "what should I make for dinner?" gets asked in every kitchen, and the answer always depends on what's already on the shelf. Alexa+ integrations run on MCP, so I wanted to build the smallest real MCP server that gives Alexa+ a useful memory of a household's pantry, and a way to demo it without Preview access.

## What it does
Pantry Chef is a self-hosted MCP server (Streamable HTTP, spec 2025-11-25) that exposes four tools: `list_pantry`, `add_to_pantry`, `remove_from_pantry` and `suggest_meals`. `suggest_meals` ranks a recipe list by how many ingredients you already have and tells you what's missing, with an optional time limit. A simulated Alexa+ web client lets you say things like "what can I cook tonight?", "add bread and avocado" or "we're out of eggs", maps them to MCP tool calls, and reads the structured result back in a voice-assistant style. The side panel shows the live `tools/list` and the last raw JSON-RPC exchange so you can see the protocol working.

## How I built it
Plain Node.js with zero dependencies. `server.js` implements the Streamable HTTP transport by hand: JSON-RPC 2.0 over `POST /mcp`, an `Mcp-Session-Id` issued on `initialize`, `202` for notifications, `structuredContent` next to text content, CORS for browser clients. The same process serves the simulator page. The simulator is a single HTML file with a small intent matcher.

## Challenges I ran into
Getting the transport details right without an SDK: session headers, the notification/response split, and batch handling. Keeping the "NLU" tiny while still handling natural phrasing like "we're out of eggs" vs "add eggs".

## Accomplishments that I'm proud of
A working MCP server that any Streamable HTTP client (including MCP Inspector) can connect to, in one file with no install step.

## What I learned
How little is actually needed to stand up a spec-compliant MCP server, and how well the tool/structured-result model fits a voice assistant.

## What's next for Pantry Chef
Connect it to a real Alexa+ Preview integration, add barcode/receipt input for the pantry, and pull recipes from a real source instead of a hardcoded list.

---

## Built with (tags)
node.js, javascript, html, mcp, alexa, json-rpc

## Organization Name
N/A

## Submitter Country of Residence
United States

## Canada province
N/A

## Primary track
Alexa+

## GitHub repo URL
https://github.com/shivanicc/pantry-chef-alexa

## New or existing prior to Aug 31, 2026?
New

## Existing project update explanation
(leave blank)

## AWS Builder Mini Challenge?
No

## Open Source Mini Challenge?
No

## Product feedback (required)
Tools used: the Alexa+ track's MCP integration path (MCP spec 2025-11-25, Streamable HTTP) and the Alexa+ simulated-experience option.

What I used it for: building a self-hosted MCP server that exposes pantry tools, and a web simulator of the Alexa+ conversation on top of it.

What worked well: MCP is small enough to implement by hand in one file, and the tool + structured-content model maps cleanly onto voice intents. The "simulated experience" option made it possible to build and demo without Preview access.

What needs work: there is no public Alexa+ MCP conformance checker or sample transcript showing exactly how Alexa+ calls initialize/tools/list/tools/call, so I had to guess at headers and session behavior from the generic MCP spec. A reference client or a hosted "connect your MCP server" test harness would remove most of the uncertainty.

Onboarding: finding the right MCP spec revision and the Streamable HTTP rules took longer than writing the server. A one-page "MCP for Alexa+" quickstart with a curl example would have cut setup time in half.

Would I build with it again: yes. MCP is the right abstraction and the barrier to entry is low.

## Feature requests (optional)
1. Hosted Alexa+ MCP test console: paste a Streamable HTTP URL, see Alexa+ enumerate tools and run a sample utterance. Important.
2. Published sample transcripts of Alexa+ ↔ MCP traffic (headers, session lifecycle). Important.
3. Local Alexa+ simulator CLI so the conversation layer doesn't have to be re-created per project. Nice-to-have.

## Friction log (optional, worth up to 10% bonus)
Task: Confirm which MCP spec revision and transport Alexa+ expects.
Steps: Read the hackathon rules, searched Alexa+ developer docs for MCP.
Expected: A page stating the spec version, transport and required headers with an example.
Actual: Rules state "spec 2025-11-25 or later, Streamable HTTP" but no Alexa+-specific example; relied on the generic MCP spec.
Severity: Medium.
Workaround: Implemented the generic Streamable HTTP contract and verified with curl and MCP Inspector.
Suggestion: Add an "MCP for Alexa+" quickstart with a minimal server and a curl session.

## Demo video script (under 3 minutes)
0:00 — Screen on the simulator page. "This is Pantry Chef, an MCP server for Alexa+. On the right you can see the server is connected over MCP and the four tools it exposes."
0:20 — Click "what's in my pantry?". "Alexa+ asks the server to list the pantry."
0:35 — Click "what can I cook tonight?". Point at the response and at the JSON-RPC trace panel. "That's a real tools/call to suggest_meals; the trace shows the request and the structured result."
1:00 — Type "add bread and avocado", then "what can I cook tonight?" again. "Now avocado toast shows up."
1:25 — Type "we're out of eggs" then "something quick, under 10 minutes".
1:45 — Switch to terminal, run the curl tools/list command from the README. "Any Streamable HTTP MCP client can connect, this is just curl."
2:10 — Show server.js briefly in the editor. "Single file, no dependencies, spec 2025-11-25."
2:30 — "That's Pantry Chef. Thanks."
