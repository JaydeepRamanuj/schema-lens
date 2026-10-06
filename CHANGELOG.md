# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-10-06

### Added

**CLI (`dbctx`)**
- `init` — connect to a PostgreSQL DB and take the first schema snapshot
- `refresh` — force re-extract the schema, bypassing freshness checks
- `status` — show snapshot age, DB reachability, and fingerprint state
- `tables` — list all tables and views, with optional name filter
- `describe` — full structural detail for one or more tables (columns, constraints, indexes, FKs, policies, triggers)
- `columns` — list columns for a single table
- `constraints` — show PK/FK/unique/check constraints for a table, with optional column filter
- `related` — BFS FK-neighbor graph (configurable depth)
- `find-column` — find tables containing columns matching a pattern
- `find-common-columns` — find columns shared by a set of tables
- `join-path` — shortest FK path between two tables
- `enums` — list PostgreSQL enum types and their values
- `policies` — list Row-Level Security policies
- `search-schema` — global keyword search across table/column names, comments, and enums
- `find-by-type` — find all columns of a specific PostgreSQL data type
- `find-polymorphic` — scan for polymorphic association patterns (`*_type` + `*_id`)
- `check-index` — check if a covering index exists for a column set
- `find-orphans` — find tables with no FK relationships
- `docs` — in-CLI command documentation

**MCP Server**
- Full MCP stdio server exposing all CLI query functions as typed tools
- Start with `dbctx mcp-serve [--name <profile>] [--url <url>]`
- Per-tool `connection_name` override for multi-database setups
- `DBCTX_GLOBAL=1` environment variable support

**Core**
- Atomic file writes with `.tmp → rename` pattern
- PID-based lock file for concurrent refresh protection
- TTL-based fingerprint short-circuit to avoid DB hits on rapid queries
- Stale-cache fallback when the database is unreachable
- Credential-free connection IDs (host:port/dbname hash only)
- Global cache support (`~/.dbctx/cache/`) via `--global` flag

**Output formats**: `compact` (default), `json`, `md`

**Configuration**: `dbctx.config.json` with named profiles, per-profile schemas, and TTL
