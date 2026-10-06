# Docusaurus Site Implementation Plan - Overview

## Goal
Build a modern, developer-focused documentation and landing page site for `schema-lens` (`dbctx`) using Docusaurus. The site will live in a `website/` folder to keep the main tool's code clean, and it will be deployed to GitHub Pages. The design will follow the Prisma Docs / shadcn UI aesthetic.

## Implementation Phases

To ensure a structured, step-by-step rollout across multiple sessions, the implementation is broken down into 5 phases. Detailed instructions for each phase are located in the corresponding markdown files in this directory.

1. **[Phase 1: Setup & Configuration](./phase-1-init-config.md)**
   - Scaffolding the Docusaurus project in the `website/` folder.
   - Configuring `docusaurus.config.ts` (navbar, footer, site metadata).
   - Ensuring `package.json` isolation.

2. **[Phase 2: Theme & Styling (Prisma/shadcn)](./phase-2-styling.md)**
   - Defining the dark zinc/slate HSL CSS tokens in `custom.css`.
   - Applying the dark-mode-first aesthetic.
   - Styling the announcement banner, sidebar pills, and content cards.

3. **[Phase 3: Custom Landing Page](./phase-3-landing-page.md)**
   - Building out `website/src/pages/index.tsx`.
   - Creating a high-conversion hero section and MCP quick-start tab blocks.

4. **[Phase 4: Docs Migration & Sidebars](./phase-4-docs-migration.md)**
   - Migrating existing `.md` files from the root `docs/` folder to `website/docs/`.
   - Creating new docs (e.g., `intro.md`, `skills.md`).
   - Organizing the navigation tree in `sidebars.ts`.

5. **[Phase 5: Deployment & CI/CD](./phase-5-deployment.md)**
   - Updating `.gitignore`.
   - Writing the GitHub Actions workflow to deploy to GitHub Pages on `main` branch pushes.

---
*Note: You can safely delete this entire `/docs/site` folder once the implementation is complete.*
