# Handoff: Shadcn UI Integration in Docusaurus

## Task Goal
The goal of this task was to integrate authentic Shadcn UI components (specifically `Select` and `Tabs`) into the Docusaurus landing page (`schema-lens`), ensuring they maintain their exact pixel-perfect dark mode styling without freezing the page or colliding with Docusaurus's global Infima CSS and strict DOM structure.

## Current State
**Status:** Completed / Working.

We achieved a robust, long-term solution by:
1. **Downgrading to Tailwind v3:** We removed Tailwind v4 (which caused severe compilation and PostCSS integration issues with Docusaurus/Rspack) and installed `tailwindcss@3`, `postcss`, and `tailwindcss-animate`.
2. **Scoping the Preflight:** We installed `tailwindcss-scoped-preflight@3` and configured it in `tailwind.config.js` to isolate Tailwind's CSS resets strictly to elements matching `.shadcn-ui`.
3. **Defining Design Tokens:** We injected the Shadcn color variables (like `--background`, `--muted`, `--primary`) into `src/css/custom.css`, scoped under `[data-theme='dark'] .shadcn-ui`.
4. **Isolating the DOM:** We wrapped the main content wrapper in `src/pages/index.tsx` with the `shadcn-ui` class. 
5. **Fixing Portals:** We added the `shadcn-ui` class directly to `SelectContent` in `select.tsx` so the Radix Portal (which renders at `document.body`) still inherits the Preflight reset and CSS variables. We also forced `border-solid` on triggers and contents because Docusaurus aggressively strips button borders.

The `InteractiveTerminal` and `SetupSection` components are now fully functional, natively rendering authentic Radix-powered Shadcn components.

## Key Files Involved
- `website/tailwind.config.js` / `website/postcss.config.js`: Contains the Tailwind v3 pipeline and the `isolateInsideOfContainer('.shadcn-ui')` configuration.
- `website/src/css/custom.css`: Holds the ultra-dark Prisma-inspired design tokens tied to Docusaurus's dark mode.
- `website/src/pages/index.tsx`: The landing page where the Docusaurus Tabs were replaced with Shadcn Tabs, and the main layout was wrapped in `.shadcn-ui`.
- `website/src/components/ui/select.tsx` & `tabs.tsx`: The Radix-based components. Modified slightly to enforce solid borders against Docusaurus's global resets.

## Next Steps
- Verify the components on all devices and screen sizes.
- If additional Shadcn components are added (like Dialog, Popover, or Tooltip), ensure their Radix `Portal` wrappers are also given the `shadcn-ui` class so they inherit the scoped variables.
- You can now safely style any future landing page or docs page by wrapping the specific component in `<div className="shadcn-ui">` and using standard Tailwind utility classes.
