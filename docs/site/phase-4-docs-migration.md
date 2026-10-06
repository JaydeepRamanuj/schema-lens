# Phase 4: Docs Migration & Sidebars

## 1. Migration of Existing Markdown

The repository currently holds markdown files in the root `docs/` folder.
**Action:** Copy (do not delete the originals, as they are used by the CLI `dbctx docs` command) the content into `website/docs/`.

Files to migrate:
- `commands.md`
- `configuration.md`
- `getting-started.md`
- `mcp-server.md`
- `output-formats.md`
- `schema-data-model.md`
- `snapshot-freshness.md`

## 2. Creating New Pages

Create the following new files in `website/docs/`:
- **`intro.md`**: High-level overview, explaining when to use this tool and when NOT to use it.
- **`skills.md`**: Explanation of the bundled `db-schema-context` agent Skill. How to drop the `SKILL.md` into an agent's workspace and the rules it enforces.

## 3. Organize `sidebars.ts`

Modify `website/sidebars.ts` to create a logical, nested structure:

```ts
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro', 'getting-started'],
    },
    {
      type: 'category',
      label: 'MCP Server',
      items: ['mcp-server'],
    },
    {
      type: 'category',
      label: 'Agent Skills',
      items: ['skills'],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      items: ['commands', 'configuration', 'output-formats'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['snapshot-freshness', 'schema-data-model'],
    }
  ],
};
```

## 4. Format Fixes
- Ensure all markdown links point to other docs correctly (e.g., replace `./configuration.md` with `configuration.md` or rely on Docusaurus internal routing).
- Add Docusaurus frontmatter (e.g., `id`, `title`, `sidebar_position`) to the top of the markdown files if necessary for better ordering.
