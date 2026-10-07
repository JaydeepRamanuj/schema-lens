# Landing page and docs strategy
_Exported on 10/7/2026 at 17:09:40 GMT+5:30 from Cursor (3.2.11)_

---

**User**

 We are struggling to achive look I want for our landing page and for docs for our website. We tried different things but we are failing to achive it (I want to achieve UI like prisma docs). Since our docs will not be so complex and will require us to only create few component, what if we droppped using docasaurus and build it from shadcn and react ? Do a phsiibility study and compare what we will gain or loose by doing so ? What does docasaurus give us that we will have hard time to achieve ? What we get in it that we don't get in our custom site ? Search online if you need it. 

Once more question, should we keep that site inside our tool repo or should it live as standalone repo ?

---

**Cursor**

I'll compare keeping Docusaurus vs a custom shadcn/React docs site (Prisma-style), and whether the site should live in this repo or separately — starting with your current setup and a quick look at how Prisma docs are built.

**Verdict:** Dropping Docusaurus for a custom React + shadcn site is feasible for your scale (~10 docs pages, no versioning/i18n), and it would solve the styling fight you’re in. Pure DIY still means rebuilding docs chrome yourself. The better match for a Prisma-like look is usually **Next.js + Fumadocs (or similar) + shadcn**, not bare React.

---

## Your situation (why this feels hard)

You’re trying to make Infima (Docusaurus) and Tailwind/shadcn coexist. The handoff you already wrote captures the real cost: scoped preflight, portal class hacks, forced borders, Tailwind v3 downgrade, tokens under `[data-theme]`. That work is permanent tax — every new Radix portal or docs MDX component reopens the conflict.

Prisma’s current docs are **not** Docusaurus. Their `prisma/web` monorepo uses **Next.js + Fumadocs**, shared UI, and a design system. You’re chasing a product that left the stack you’re fighting with.

Your docs are small: intro, getting started, MCP, skills, CLI refs, a couple architecture pages. Blog is off. Single locale. No doc versions. So you are **not** using most of what Docusaurus is best at.

---

## Three options (not two)

| | **A. Stay on Docusaurus** | **B. Custom React + shadcn only** | **C. Next.js + Fumadocs + shadcn** (Prisma-like) |
|---|---|---|---|
| Landing UI control | Hard (Infima fight) | Excellent | Excellent |
| Docs chrome | Free | You build it | Mostly free |
| Prisma-like look | Possible with pain | Yes | Closest path |
| Time to “good docs” | Already there | Weeks of plumbing | Days–1–2 weeks |
| Long-term maintenance | Theme upgrades + CSS wars | Own everything | Own UI, inherit docs features |

**Recommendation for your goals:** prefer **C** over bare **B**. Use **B** only if you want maximum control and accept rebuilding sidebar/TOC/search/MDX routing.

---

## What you gain by leaving Docusaurus

1. **One design system** — Landing and docs share the same tokens, typography, and components. No `.shadcn-ui` isolation layer.
2. **Prisma-like UI is easier** — Full-bleed heroes, custom nav, dense code layouts, interactive install wizards without swizzling Infima.
3. **Modern React freely** — App Router, RSC, normal Tailwind (including v4 if you want), no Rspack/Docusaurus plugin quirks.
4. **Simpler mental model** — “Pages + MDX + layout components” instead of presets, swizzle, classic theme overrides.
5. **Fewer CSS landmines** — Your InteractiveTerminal / Select / Tabs stop being special cases.

---

## What you lose (or must rebuild)

These are the Docusaurus features that are **deceptively expensive** to recreate well:

### Hard / high effort if you go pure custom (option B)

| Capability | Why it’s hard |
|---|---|
| **Docs layout** | Collapsible sidebar, active section highlighting, mobile drawer, sticky TOC, prev/next footer, breadcrumbs |
| **MDX content pipeline** | Frontmatter → routes, heading IDs, table of contents extraction, MDX component map (callouts, code tabs, cards) |
| **Search** | Algolia DocSearch or local full-text index (Orama/Pagefind) wired to keyboard UI |
| **Broken-link checking** | Docusaurus `onBrokenLinks: 'throw'` catches bad links at build time |
| **Code blocks** | Copy button, line highlighting, language tabs, consistent dark theme |
| **SEO / OG / sitemap** | Per-page meta, canonical URLs, sitemap generation (Next helps; bare Vite SPA does not) |
| **Static deploy + routing** | GitHub Pages `baseUrl`, trailing slashes, client-side 404s — easy to get wrong |

### Medium effort / often “good enough later”

- Admonitions / callouts, last-updated timestamps, edit-on-GitHub links  
- Accessibility defaults in nav/TOC  
- Plugin ecosystem (diagrams, OpenAPI, etc.)

### Easy to skip for you right now (low loss)

- **Doc versioning** (`docusaurus docs:version`) — you don’t use it  
- **i18n** — single locale  
- **Blog** — already disabled  
- Large plugin marketplace — not needed for ~10 pages  

So: you are **not** losing the features that make Docusaurus uniquely valuable for big OSS projects. You **are** losing the boring plumbing that makes “write Markdown → ship docs site” feel free.

With **Fumadocs**, most of that plumbing comes back: MDX source, docs layout, TOC, local search, shadcn preset, Tailwind-native theming. Versioning/i18n are weaker than Docusaurus, which matches your needs.

---

## Feasibility for *your* site specifically

**Landing page:** Custom (or Fumadocs host app) wins clearly. That’s where Docusaurus has been blocking you.

**Docs:** With few pages and few custom components, pure React is doable but you’ll still spend time on:

- File-based MDX routes + sidebar config (you already have `sidebars.ts` — you’d reimplement that)  
- A small set of MDX components (Callout, CodeTabs, Steps)  
- Search once the site grows past ~15–20 pages  

**Rough effort (order of magnitude):**

- **Stay + keep fighting CSS:** ongoing friction; landing never feels “owned”  
- **Migrate to Fumadocs + port MDX + rebuild landing:** ~1–2 focused weeks  
- **Greenfield React/Vite + own docs engine:** ~3–6 weeks to reach parity on polish (search, TOC, mobile nav, SEO), then ongoing  

**Risk if you go pure custom:** you trade Infima fights for “we still need to polish docs chrome,” and content velocity slows while you build the shell.

---

## Practical recommendation

1. **If the #1 goal is Prisma-like UI:** leave Infima. Don’t invest more in scoped Tailwind workarounds.  
2. **Don’t jump to bare React** unless you enjoy owning docs infrastructure. Prefer **Next.js + Fumadocs + shadcn** (or Nextra if you prefer that ecosystem). That’s the same class of architecture Prisma uses.  
3. **Keep Docusaurus only if** you’re willing to accept a “good enough” Infima-themed docs area and put design energy mainly on a custom landing page (still painful, but less rewrite). For your stated goal, that’s the weaker long-term bet.

---

## Same repo vs standalone repo?

**Keep the site in this tool repo** (`website/` or `apps/docs`) for now.

| Keep in tool repo | Separate docs/marketing repo |
|---|---|
| Docs stay versioned with the CLI/MCP code | Cleaner if marketing has different owners/cadence |
| One PR can change API + docs together | Extra sync for releases, examples, changelogs |
| Your GH Pages workflow already keys off `website/**` | Useful for multi-product orgs / large brand sites |
| Fits a small OSS CLI like schema-lens | Overkill until the site is a product of its own |

**Split later** if: the site becomes a multi-app marketing surface, docs deploy on a different schedule than the tool, or non-tool contributors need access without the whole codebase.

Prisma’s docs live in a **separate web monorepo** because they have site + blog + docs + design system at company scale. You’re not there yet.

**Pattern that works well:** keep `website/` (or `apps/web`) in-repo, isolated `package.json` (you already do), deploy independently via path filters — same as today.

---

## Bottom line

- **Dropping Docusaurus is justified** given your UI goal and small docs surface.  
- **Pure shadcn + React** gains design freedom but loses docs plumbing you’ll feel within weeks.  
- **Best fit:** Next/Fumadocs-style docs layer + shadcn for the look Prisma has.  
- **Repo:** keep it inside the tool repo until the website outgrows the product.

If you want a follow-up in Agent mode, I can sketch a concrete migration plan (content map, route layout, what to port from `website/docs`, deploy to GitHub Pages with `baseUrl`).

---

**User**

Okay then let's go with plan C. Make complete plan about how we can achieve that look with plan C. Understand what we already build and how to port it to that setup. Take your time and then create complete plan. 

---

**Cursor**

I'll map everything you've already built in `website/` and how Fumadocs + shadcn would take it over, then draft a full migration plan.

Task calls failed on a bad arg — reading the key website files directly.

I have enough to commit to a concrete migration path: replace `website/` with Next.js + Fumadocs + shadcn, keep GitHub Pages static export, and port the landing and docs you already have.

---

**User**

Migrate website to Next.js + Fumadocs + shadcn

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll start the migration by scaffolding Next.js + Fumadocs in `website/`, then port the landing, docs, search, and CI.

Backing up docs and key components, then scaffolding the new Next.js + Fumadocs app.

Scaffold is ready. I'll read the generated files, swap `website/` for the new app, then configure static export and port content.

---

**User**

continue

---

**Cursor**

Picking up from the scaffold swap — checking what's in place, then continuing the migration.

---

**User**

Please write a handoff file into /docs/handoff. 

