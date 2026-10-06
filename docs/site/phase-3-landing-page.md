# Phase 3: Custom Landing Page

## 1. Overhaul `index.tsx`

Delete the boilerplate `website/src/pages/index.tsx` and replace it with a custom React component. The page should be visually engaging and developer-centric.

## 2. Section Requirements

### Hero Section
- **Headline**: "Stop guessing your schema. Let your AI agent look it up."
- **Sub-headline**: "schema-lens caches your PostgreSQL schema locally and serves accurate answers in milliseconds — no SQL, no round-trips, no hallucinated column names."
- **CTAs**: "Get Started" (routes to `/docs/intro`) and "View on GitHub".
- **Visual**: A clean, animated terminal window showing `dbctx init` running instantly.

### The "60-Second Setup" (Crucial)
A prominent section showcasing how easy it is to add to an agent's MCP config. Use a tabbed interface (using Docusaurus `@theme/Tabs`) for:
- Claude Desktop
- Cursor
- Antigravity

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve"]
    }
  }
}
```

### Problem vs Solution Table
Translate the "Without `schema-lens` | With `schema-lens`" markdown table from the README into a beautiful visual grid using CSS Grid and standard Tailwind/shadcn card styling. 

### Feature Highlight Cards
Create a 3-column layout highlighting:
1. 🚀 Offline-Capable (Serves cached schema)
2. ⚡ Millisecond Reads (No DB round-trips)
3. 🔄 Auto-Fresh (Fingerprint drift detection)
