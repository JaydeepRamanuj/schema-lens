# Phase 5: Deployment & CI/CD

## 1. Update `.gitignore`

Add the Docusaurus build output and temporary files to the root `.gitignore`:

```text
# Docusaurus / Website
website/.docusaurus/
website/build/
website/node_modules/
```

## 2. GitHub Actions Workflow

Create a new file at `.github/workflows/deploy-docs.yml` to automatically build and deploy the site to the `gh-pages` branch on every push to `main`.

```yaml
name: Deploy Docs to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'website/**'
      - '.github/workflows/deploy-docs.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: website/package-lock.json

      - name: Install website deps
        run: npm ci
        working-directory: ./website

      - name: Build Docusaurus
        run: npm run build
        working-directory: ./website

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./website/build
```

## 3. Final Verification
- Run `npm run build` locally in `website/` to ensure Docusaurus's strict broken-link checker passes.
- Commit all changes to `main`.
- Wait for the GitHub Action to complete.
- Verify the site is live at `https://jdr-topia.github.io/schema-lens`.
- Ensure the "Website" link in the GitHub repository's About section is updated to point to this URL.
