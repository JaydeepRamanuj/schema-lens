export interface CommandDoc {
  name: string;
  description: string;
  usage: string;
  arguments?: { name: string; description: string; required: boolean }[];
  options?: { flags: string; description: string; default?: string }[];
  examples?: string[];
  outputShape?: string; // Description of the output
}

export const COMMAND_DOCS: Record<string, CommandDoc> = {
  init: {
    name: "init",
    description: "Create a connection profile and take the first snapshot of the database schema.",
    usage: "dbctx init [options]",
    options: [
      { flags: "--url <url>", description: "Postgres connection URL" },
      { flags: "--name <name>", description: "Named profile from dbctx.config.json" },
      { flags: "--global", description: "Use global cache directory" },
    ],
    examples: [
      "dbctx init",
      "dbctx init --name local_dev",
      "dbctx init --url postgres://user:pass@localhost:5432/db"
    ],
    outputShape: "Plain text indicating success, snapshot ID, and number of tables captured."
  },
  refresh: {
    name: "refresh",
    description: "Force re-extract the schema from the database, skipping freshness checks.",
    usage: "dbctx refresh [options]",
    options: [
      { flags: "--force", description: "Skip freshness check and always re-extract" }
    ],
    examples: ["dbctx refresh", "dbctx refresh --force"],
    outputShape: "Plain text indicating success and number of tables captured."
  },
  status: {
    name: "status",
    description: "Show snapshot age, database reachability, and fingerprint state.",
    usage: "dbctx status [options]",
    examples: ["dbctx status", "dbctx status --format json"],
    outputShape: "JSON containing verifiedAt (timestamp), refreshed (boolean), and stale (boolean)."
  },
  tables: {
    name: "tables",
    description: "List all tables in the database snapshot.",
    usage: "dbctx tables [options]",
    options: [
      { flags: "--filter <pattern>", description: "Filter by table name (substring or regex)" }
    ],
    examples: [
      "dbctx tables",
      "dbctx tables --filter users",
      "dbctx tables --format md"
    ],
    outputShape: "Array of table objects containing name, type (table/view), and optional comment."
  },
  describe: {
    name: "describe",
    description: "Get full detail (columns, constraints, indexes, etc.) for one or more tables.",
    usage: "dbctx describe <tables...> [options]",
    arguments: [
      { name: "tables...", description: "One or more table names to describe", required: true }
    ],
    options: [
      { flags: "--include <sections>", description: "Comma-separated sections to include: columns,constraints,indexes,fks,policies,triggers" }
    ],
    examples: [
      "dbctx describe users",
      "dbctx describe public.users auth.sessions",
      "dbctx describe users --include columns,indexes"
    ],
    outputShape: "Dictionary mapping table names to their full schema definition (columns, constraints, indexes)."
  },
  columns: {
    name: "columns",
    description: "List all columns for a specific table.",
    usage: "dbctx columns <table> [options]",
    arguments: [
      { name: "table", description: "The name of the table", required: true }
    ],
    examples: ["dbctx columns users", "dbctx columns public.users --format json"],
    outputShape: "Array of column objects (name, type, nullable, default, comment)."
  },
  constraints: {
    name: "constraints",
    description: "Show constraints (Primary Key, Foreign Key, Unique, Check) for a table.",
    usage: "dbctx constraints <table> [options]",
    arguments: [
      { name: "table", description: "The name of the table", required: true }
    ],
    options: [
      { flags: "--columns <cols>", description: "Comma-separated column names to filter by" }
    ],
    examples: [
      "dbctx constraints users",
      "dbctx constraints users --columns id,email"
    ],
    outputShape: "Array of constraint objects (name, type, columns, references, onDelete)."
  },
  related: {
    name: "related",
    description: "Show foreign key neighbors (both incoming and outgoing) for a table.",
    usage: "dbctx related <table> [options]",
    arguments: [
      { name: "table", description: "The name of the table", required: true }
    ],
    options: [
      { flags: "--depth <n>", description: "Traversal depth for relationships", default: "1" }
    ],
    examples: [
      "dbctx related users",
      "dbctx related users --depth 2"
    ],
    outputShape: "Graph object with root table, depth, and array of edges (from, to, via columns)."
  },
  "find-column": {
    name: "find-column",
    description: "Find all tables that contain a column matching a specific pattern.",
    usage: "dbctx find-column <pattern> [options]",
    arguments: [
      { name: "pattern", description: "Substring or regex pattern to match column names", required: true }
    ],
    examples: ["dbctx find-column user_id", "dbctx find-column ^is_.*"],
    outputShape: "Array of matches containing the table name and the column definition."
  },
  "find-common-columns": {
    name: "find-common-columns",
    description: "Find columns that exist in all of the specified tables.",
    usage: "dbctx find-common-columns <tables...> [options]",
    arguments: [
      { name: "tables...", description: "Two or more table names to compare", required: true }
    ],
    options: [
      { flags: "--pattern <regex>", description: "Optional regex pattern to filter common columns" }
    ],
    examples: [
      "dbctx find-common-columns users posts",
      "dbctx find-common-columns users posts --pattern id$"
    ],
    outputShape: "Array of column names that are shared across all provided tables."
  },
  "join-path": {
    name: "join-path",
    description: "Find the shortest foreign key path between two tables.",
    usage: "dbctx join-path <from> <to> [options]",
    arguments: [
      { name: "from", description: "Starting table", required: true },
      { name: "to", description: "Target table", required: true }
    ],
    examples: ["dbctx join-path users comments"],
    outputShape: "Object containing the full path (array of table names) and detailed edge relationships."
  },
  enums: {
    name: "enums",
    description: "List enum types and their allowed values.",
    usage: "dbctx enums [name] [options]",
    arguments: [
      { name: "name", description: "Optional enum name to filter by", required: false }
    ],
    examples: ["dbctx enums", "dbctx enums user_role"],
    outputShape: "Dictionary mapping enum names to an object containing their allowed values."
  },
  policies: {
    name: "policies",
    description: "Show Row-Level Security (RLS) policies.",
    usage: "dbctx policies [table] [options]",
    arguments: [
      { name: "table", description: "Optional table name to filter policies", required: false }
    ],
    examples: ["dbctx policies", "dbctx policies users"],
    outputShape: "Array of policy objects (table, name, cmd, permissive, roles)."
  },
  "search-schema": {
    name: "search-schema",
    description: "Global semantic search across table names, column names, comments, and enums.",
    usage: "dbctx search-schema <keyword> [options]",
    arguments: [
      { name: "keyword", description: "Keyword to search for", required: true }
    ],
    examples: ["dbctx search-schema auth", "dbctx search-schema password"],
    outputShape: "Array of match objects indicating the location, type (table/column/enum), and reason for the match."
  },
  "find-by-type": {
    name: "find-by-type",
    description: "Find all columns that match a specific PostgreSQL data type.",
    usage: "dbctx find-by-type <type> [options]",
    arguments: [
      { name: "type", description: "Data type (e.g., uuid, timestamp with time zone)", required: true }
    ],
    examples: ["dbctx find-by-type uuid", "dbctx find-by-type jsonb"],
    outputShape: "Array of matches containing the table and column details."
  },
  "find-polymorphic": {
    name: "find-polymorphic",
    description: "Scan for polymorphic association patterns (e.g., item_type and item_id columns in the same table).",
    usage: "dbctx find-polymorphic [options]",
    examples: ["dbctx find-polymorphic"],
    outputShape: "Array of matches containing the table, typeColumn, and idColumn."
  },
  "check-index": {
    name: "check-index",
    description: "Check if a covering index exists for the specified set of columns on a table.",
    usage: "dbctx check-index <table> <columns...> [options]",
    arguments: [
      { name: "table", description: "Table name", required: true },
      { name: "columns...", description: "One or more column names", required: true }
    ],
    examples: ["dbctx check-index users email", "dbctx check-index posts author_id created_at"],
    outputShape: "Object indicating if fully covered (boolean), the covering index details, and any partial matches."
  },
  "find-orphans": {
    name: "find-orphans",
    description: "Find tables with no incoming or outgoing foreign key relationships.",
    usage: "dbctx find-orphans [options]",
    examples: ["dbctx find-orphans"],
    outputShape: "Array of orphaned table names."
  }
};

export function renderCommandDocMarkdown(doc: CommandDoc): string {
  const lines: string[] = [];
  
  lines.push(`# \`${doc.name}\``);
  lines.push(`> ${doc.description}`);
  lines.push("");
  lines.push("### Usage");
  lines.push(`\`\`\`bash\n${doc.usage}\n\`\`\``);
  lines.push("");

  if (doc.arguments && doc.arguments.length > 0) {
    lines.push("### Arguments");
    doc.arguments.forEach(arg => {
      lines.push(`- \`${arg.name}\` (${arg.required ? "required" : "optional"}): ${arg.description}`);
    });
    lines.push("");
  }

  if (doc.options && doc.options.length > 0) {
    lines.push("### Options (Specific to this command)");
    doc.options.forEach(opt => {
      let line = `- \`${opt.flags}\`: ${opt.description}`;
      if (opt.default) {
        line += ` (default: ${opt.default})`;
      }
      lines.push(line);
    });
    lines.push("");
  }

  lines.push("*(Note: Global options like `--format`, `--url`, and `--name` are also supported).*");
  lines.push("");

  if (doc.outputShape) {
    lines.push("### Expected Output");
    lines.push(doc.outputShape);
    lines.push("");
  }

  if (doc.examples && doc.examples.length > 0) {
    lines.push("### Examples");
    doc.examples.forEach(ex => {
      lines.push(`\`\`\`bash\n${ex}\n\`\`\``);
    });
    lines.push("");
  }

  return lines.join("\n");
}
