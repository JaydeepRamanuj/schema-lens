# Phase 2: Theme & Styling (Prisma / shadcn Aesthetic)

## 1. Apply Shadcn CSS Tokens

Open `website/src/css/custom.css` and replace its contents to implement the Prisma Docs / shadcn dark-mode theme.

```css
/* shadcn-inspired dark design tokens */
:root {
  /* Default to dark theme tokens for smooth loading */
  --background: 240 10% 3.9%;            /* #09090b - Ultra dark zinc */
  --card: 240 10% 6.5%;                  /* #111215 - Card container */
  --card-foreground: 0 0% 98%;           /* #fafafa */
  --primary: 187 85% 53%;                /* #22d3ee - Prisma cyan accent */
  --muted-foreground: 240 5% 64.9%;      /* #a1a1aa - Muted body text */
  --border: 240 3.7% 15.9%;               /* #27272a - Clean subtle borders */
  --radius: 0.5rem;                       /* Rounded UI cards */
}

[data-theme='dark'] {
  --ifm-background-color: hsl(var(--background));
  --ifm-navbar-background-color: hsl(var(--background));
  --ifm-card-background-color: hsl(var(--card));
  
  --ifm-color-primary: hsl(var(--primary));
  --ifm-color-primary-dark: #06b6d4;
  
  --ifm-font-color-base: hsl(var(--muted-foreground));
  --ifm-heading-color: hsl(var(--card-foreground));
  
  --ifm-toc-border-color: hsl(var(--border));
  --ifm-hr-border-color: hsl(var(--border));
  
  --ifm-code-font-size: 88%;
  --ifm-font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

## 2. Component Overrides

Add specific overrides in `custom.css` to replicate Prisma's layout feel:

- **Sidebar active links**: Override Docusaurus sidebar item classes to use a pill-shape (`border-radius: 9999px`) with a subtle `rgba(255,255,255,0.08)` background when active.
- **Announcement Bar**: Add a diagonal gradient (teal to blue) matching Prisma's release announcements.
- **Content Max-Width**: Ensure the main markdown container looks like an elevated card (`hsl(var(--card))`) floating on the darker background (`hsl(var(--background))`).

## 3. Dark Mode Default

In `docusaurus.config.ts`, force the theme to dark mode by default (or entirely disable the light mode toggle if you want a strictly dark docs site, which is common for developer tools):

```ts
colorMode: {
  defaultMode: 'dark',
  disableSwitch: false,
  respectPrefersColorScheme: true,
}
```
