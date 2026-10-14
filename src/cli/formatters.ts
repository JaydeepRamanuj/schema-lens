// ============================================================
// formatters.ts — output renderers for json | md | compact formats.
// Every formatter appends a freshness footer.
// ============================================================

import type {
  NormalizedSchema,
  SchemaTable,
  SchemaColumn,
  SchemaConstraint,
  SchemaIndex,
  OutputFormat,
  QueryResponse,
} from "../core/types.js";

// --------------- Freshness footer ---------------

export function freshnessFooter(resp: {
  verifiedAt: string;
  refreshed: boolean;
  stale: boolean;
  staleReason?: string;
}): string {
  const parts = [`verified ${resp.verifiedAt}`];
  if (resp.refreshed) parts.push("refreshed: true");
  if (resp.stale) parts.push(`stale: true (${resp.staleReason ?? "unknown"})`);
  return `--- [${parts.join(" | ")}]`;
}

// --------------- JSON formatter ---------------

export function formatJson<T>(resp: QueryResponse<T>): string {
  const { data, ...meta } = resp;
  const out = { ...meta, result: data };
  return JSON.stringify(out, null, 2);
}

// --------------- Markdown formatter ---------------

function mdTableHeader(cols: string[]): string {
  return (
    `| ${cols.join(" | ")} |\n` +
    `| ${cols.map(() => "---").join(" | ")} |`
  );
}

export function formatMarkdown<T>(resp: QueryResponse<T>, hint: string): string {
  const lines: string[] = [];
  lines.push(JSON.stringify(resp.data, null, 2)); // fallback — overridden per command
  lines.push("\n" + freshnessFooter(resp));
  return lines.join("\n");
}

// Specific markdown renderers
export function mdDescribe(
  tables: Record<string, Partial<SchemaTable>>
): string {
  const lines: string[] = [];

  for (const [tableName, table] of Object.entries(tables)) {
    lines.push(`## ${tableName} (${table.type ?? "table"})`);
    if (table.comment) lines.push(`*${table.comment}*`);
    if (table.rlsEnabled) lines.push(`> RLS enabled${table.rlsForced ? " (forced)" : ""}`);
    lines.push("");

    if (table.columns && table.columns.length > 0) {
      lines.push("### Columns");
      lines.push(mdTableHeader(["Name", "Type", "Nullable", "Default", "Comment"]));
      for (const col of table.columns) {
        lines.push(
          `| ${col.name} | ${col.type} | ${col.nullable ? "yes" : "no"} | ${col.default ?? ""} | ${col.comment ?? ""} |`
        );
      }
      lines.push("");
    }

    if (table.constraints && table.constraints.length > 0) {
      lines.push("### Constraints");
      lines.push(mdTableHeader(["Name", "Type", "Columns", "References", "On Delete"]));
      for (const con of table.constraints) {
        const ref = con.references
          ? `${con.references.table} (${con.references.columns.join(", ")})`
          : "";
        lines.push(
          `| ${con.name} | ${con.type} | ${con.columns.join(", ")} | ${ref} | ${con.onDelete ?? ""} |`
        );
      }
      lines.push("");
    }

    if (table.indexes && table.indexes.length > 0) {
      lines.push("### Indexes");
      lines.push(mdTableHeader(["Name", "Columns", "Unique"]));
      for (const idx of table.indexes) {
        lines.push(
          `| ${idx.name} | ${idx.columns.join(", ")} | ${idx.unique ? "yes" : "no"} |`
        );
      }
      lines.push("");
    }

    if (table.policies && table.policies.length > 0) {
      lines.push("### RLS Policies");
      lines.push(mdTableHeader(["Name", "Cmd", "Permissive", "Roles"]));
      for (const pol of table.policies) {
        lines.push(
          `| ${pol.name} | ${pol.cmd} | ${pol.permissive ? "yes" : "no"} | ${pol.roles.join(", ")} |`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// --------------- Compact formatter ---------------

function fkArrow(con: SchemaConstraint): string {
  if (!con.references) return "";
  return ` → ${con.references.table}.${con.references.columns.join(",")}${con.onDelete ? ` (ON DELETE ${con.onDelete})` : ""}`;
}

function compactColumn(
  col: SchemaColumn,
  constraints: SchemaConstraint[]
): string {
  const isPk = constraints.some(
    (c) => c.type === "PRIMARY KEY" && c.columns.includes(col.name)
  );
  const fk = constraints.find(
    (c) => c.type === "FOREIGN KEY" && c.columns.includes(col.name)
  );
  const isUnique = constraints.some(
    (c) => c.type === "UNIQUE" && c.columns.includes(col.name)
  );
  const checks = constraints.filter(
    (c) => c.type === "CHECK" && c.columns.includes(col.name)
  );

  const flags: string[] = [];
  if (isPk) flags.push("PK");
  if (isUnique && !isPk) flags.push("UNIQUE");
  if (!col.nullable) flags.push("not null");
  if (col.default) flags.push(`default ${col.default}`);
  for (const chk of checks) {
    if (chk.def) flags.push(chk.def.replace(/^CHECK\s*/i, "").trim());
  }

  const fkStr = fk ? fkArrow(fk) : "";
  const flagStr = flags.length ? ` ${flags.join(" ")}` : "";

  return `  ${col.name} ${col.type}${flagStr}${fkStr}`;
}

export function compactDescribe(
  tables: Record<string, Partial<SchemaTable>>
): string {
  const lines: string[] = [];

  for (const [tableName, table] of Object.entries(tables)) {
    const label = table.type === "view" ? "view" : table.type === "materialized_view" ? "mat_view" : "table";
    lines.push(`\n${tableName} (${label})`);
    if (table.comment) lines.push(`  -- ${table.comment}`);

    if (table.columns) {
      for (const col of table.columns) {
        lines.push(compactColumn(col, table.constraints ?? []));
      }
    }

    // List non-column-specific constraints (multi-column PKs, etc.)
    const multiColConstraints = (table.constraints ?? []).filter(
      (c) =>
        c.columns.length > 1 &&
        (c.type === "PRIMARY KEY" || c.type === "UNIQUE")
    );
    for (const con of multiColConstraints) {
      lines.push(
        `  [${con.type} (${con.columns.join(", ")})]`
      );
    }

    // Indexes (non-PK)
    if (table.indexes && table.indexes.length > 0) {
      for (const idx of table.indexes) {
        lines.push(
          `  [INDEX ${idx.name} (${idx.columns.join(", ")})${idx.unique ? " UNIQUE" : ""}]`
        );
      }
    }
  }

  return lines.join("\n");
}

// --------------- Format dispatcher ---------------

export function formatOutput(
  format: OutputFormat,
  data: unknown,
  freshnessInfo: { verifiedAt: string; refreshed: boolean; stale: boolean; staleReason?: string },
  describeHint?: Record<string, Partial<SchemaTable>>
): string {
  const footer = "\n" + freshnessFooter(freshnessInfo);

  switch (format) {
    case "json":
      return JSON.stringify({ result: data, ...freshnessInfo }, null, 2);

    case "md":
      if (describeHint) {
        return mdDescribe(describeHint) + footer;
      }
      return JSON.stringify(data, null, 2) + footer;

    case "compact":
    default:
      if (describeHint) {
        return compactDescribe(describeHint) + footer;
      }
      return JSON.stringify(data, null, 2) + footer;
  }
}
