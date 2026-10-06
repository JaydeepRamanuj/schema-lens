# Phase 1: Setup & Configuration

## 1. Scaffold Docusaurus

From the root of the `schema-context-tool` repository, run the initialization command. We will use the classic template with TypeScript.

```bash
npx create-docusaurus@latest website classic --typescript
```

This will create a `website/` directory containing an isolated Docusaurus project.

## 2. Package.json Management

The `website/package.json` ensures that all web dependencies (React, Docusaurus) do not pollute the main CLI tool's `package.json`. 
- Ensure `website/package.json` contains `"private": true`.
- Run `npm install` inside the `website/` folder to generate its own `package-lock.json`.

## 3. Configure `docusaurus.config.ts`

Edit `website/docusaurus.config.ts` to reflect the `schema-lens` branding.

**Key updates:**
- `title`: `'schema-lens'`
- `tagline`: `'Stop guessing your schema. Let your AI agent look it up.'`
- `url`: `'https://jdr-topia.github.io'`
- `baseUrl`: `'/schema-lens/'`
- `organizationName`: `'jdr-topia'`
- `projectName`: `'schema-lens'`
- `trailingSlash`: `false`

**Theme Config / Navbar:**
- Logo: (Use text "schema-lens" or an SVG logo if available).
- Links: "Docs" (pointing to `/docs/intro`), "GitHub" (pointing to the repo).
- Search: Enable the default search (or Algolia if you have an API key).

**Theme Config / Footer:**
- Links to GitHub, License, and important documentation sections (Commands, Configuration, MCP Server).
- Copyright: `Copyright © ${new Date().getFullYear()} jdr-topia.`
