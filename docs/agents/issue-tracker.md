# Issue tracker: Linear (via MCP)

Issues and specs for this repo live in **Linear**, project **"Ascendant"**. Access is through the **Linear MCP server**: issue operations are exposed as MCP tools the agent calls directly.

## Conventions

- **Create an issue**: call the Linear MCP tool to create the issue, targeting project "Ascendant". Set the title, description, and triage label (see `triage-labels.md`).
- **Read an issue**: call the Linear MCP tool to fetch by key (e.g. `ASC-123`) or to search.
- **Comment**: call the Linear MCP comment tool.
- **Triage state**: applied as Linear labels matching the role strings in `triage-labels.md`.
- **Wayfinding**: map and child tickets are created in Linear via MCP; blocking edges are recorded in the issue body (e.g. `Blocked by: ASC-99`).
- Exact tool names depend on which Linear MCP server is configured; if a call surface differs, prefer the server's own tools over the examples above.
