---
id: skills
title: Agent Skills
sidebar_position: 3
---

# Agent Skills

`schema-lens` includes a bundled `db-schema-context` Agent Skill that you can drop directly into your AI agent's workspace.

## How to use the Skill

To use the skill, copy the provided `SKILL.md` (which can be generated or found in the package) into your agent's skills directory.

### What the skill does
The skill instructs your AI agent on how to:
1. Properly execute `dbctx` commands.
2. Read the structured output formats (JSON/Markdown) appropriately.
3. Understand database schema relationships (Foreign keys, Indexes) locally before attempting to write code.
4. Detect drift using the fingerprint feature and ask for user confirmation if the schema is stale.

This ensures that the AI relies on the cached snapshot rather than hallucinating schema elements.
