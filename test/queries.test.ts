// ============================================================
// queries.test.ts — unit tests for all query functions.
// No DB required — uses the fixture schema.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { NormalizedSchema } from "../src/core/types.js";
import {
  listTables,
  describe as describeQuery,
  getColumns,
  getColumnConstraints,
  related,
  findColumns,
  joinPath,
  getEnums,
  getPolicies,
  buildStatus,
} from "../src/core/queries.js";

// --------------- Load fixture ---------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/schema-sample.json"), "utf8")
) as NormalizedSchema;

// --------------- listTables ---------------

describe("listTables", () => {
  it("returns all tables when no filter", () => {
    const result = listTables(fixture);
    expect(result.total).toBe(4);
    expect(result.tables.map((t) => t.name)).toContain("public.orders");
  });

  it("filters by substring", () => {
    const result = listTables(fixture, "order");
    expect(result.total).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain("public.orders");
    expect(result.tables.map((t) => t.name)).toContain("public.order_items");
  });

  it("filters by regex", () => {
    const result = listTables(fixture, "^public\\.users$");
    expect(result.total).toBe(1);
    expect(result.tables[0]!.name).toBe("public.users");
  });

  it("returns empty when no match", () => {
    const result = listTables(fixture, "nonexistent_xyz");
    expect(result.total).toBe(0);
  });
});

// --------------- describe ---------------

describe("describe", () => {
  it("returns multiple tables in one call", () => {
    const result = describeQuery(fixture, ["public.users", "public.orders"]);
    expect(Object.keys(result.tables)).toHaveLength(2);
    expect(result.tables["public.users"]).toBeDefined();
    expect(result.tables["public.orders"]).toBeDefined();
  });

  it("bare name resolves to public schema", () => {
    const result = describeQuery(fixture, ["users"]);
    expect(result.tables["public.users"]).toBeDefined();
  });

  it("include filter: columns only", () => {
    const result = describeQuery(fixture, ["public.orders"], ["columns"]);
    const table = result.tables["public.orders"]!;
    expect(table.columns).toBeDefined();
    expect(table.indexes).toBeUndefined();
    expect(table.policies).toBeUndefined();
  });

  it("include filter: fks only returns only FK constraints", () => {
    const result = describeQuery(fixture, ["public.orders"], ["fks"]);
    const table = result.tables["public.orders"]!;
    expect(table.constraints?.every((c) => c.type === "FOREIGN KEY")).toBe(true);
  });

  it("throws on unknown table", () => {
    expect(() => describeQuery(fixture, ["public.nonexistent"])).toThrow();
  });
});

// --------------- getColumns ---------------

describe("getColumns", () => {
  it("returns all columns for a table", () => {
    const cols = getColumns(fixture, "public.orders");
    expect(cols).toHaveLength(4);
    expect(cols.map((c) => c.name)).toContain("user_id");
  });
});

// --------------- getColumnConstraints ---------------

describe("getColumnConstraints", () => {
  it("returns constraints touching the requested columns", () => {
    const cons = getColumnConstraints(fixture, "public.orders", ["user_id"]);
    expect(cons.some((c) => c.type === "FOREIGN KEY")).toBe(true);
  });

  it("returns check constraint for total column", () => {
    const cons = getColumnConstraints(fixture, "public.orders", ["total"]);
    expect(cons.some((c) => c.type === "CHECK")).toBe(true);
  });

  it("returns empty for column with no constraints", () => {
    const cons = getColumnConstraints(fixture, "public.users", ["created_at"]);
    expect(cons).toHaveLength(0);
  });
});

// --------------- related ---------------

describe("related", () => {
  it("returns direct FK neighbors (depth 1)", () => {
    const result = related(fixture, "public.orders", 1);
    expect(result.nodes).toContain("public.users");
    expect(result.nodes).toContain("public.order_items");
  });

  it("returns transitive neighbors (depth 2)", () => {
    const result = related(fixture, "public.orders", 2);
    expect(result.nodes).toContain("public.products");
  });

  it("edges have correct direction", () => {
    const result = related(fixture, "public.orders", 1);
    const fkEdge = result.edges.find(
      (e) => e.from === "public.orders" && e.to === "public.users"
    );
    expect(fkEdge).toBeDefined();
    expect(fkEdge?.via).toContain("user_id");
  });

  it("throws for unknown table", () => {
    expect(() => related(fixture, "public.nonexistent")).toThrow();
  });
});

// --------------- findColumns ---------------

describe("findColumns", () => {
  it("finds columns by exact name", () => {
    const result = findColumns(fixture, "email");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]!.table).toBe("public.users");
  });

  it("finds columns matching partial name", () => {
    const result = findColumns(fixture, "_id");
    expect(result.matches.map((m) => m.column.name)).toContain("user_id");
    expect(result.matches.map((m) => m.column.name)).toContain("order_id");
  });

  it("returns empty when no match", () => {
    const result = findColumns(fixture, "xyz_totally_nonexistent");
    expect(result.matches).toHaveLength(0);
  });
});

// --------------- joinPath ---------------

describe("joinPath", () => {
  it("finds direct path between connected tables", () => {
    const result = joinPath(fixture, "public.orders", "public.users");
    expect(result.path).not.toBeNull();
    expect(result.path).toContain("public.orders");
    expect(result.path).toContain("public.users");
  });

  it("finds 2-hop path", () => {
    const result = joinPath(fixture, "public.users", "public.order_items");
    expect(result.path).not.toBeNull();
    expect(result.path!.length).toBe(3);
  });

  it("finds path between tables with no direct FK (via common relation)", () => {
    const result = joinPath(fixture, "public.products", "public.orders");
    expect(result.path).not.toBeNull();
    expect(result.path!.length).toBe(3); // products → order_items → orders
  });

  it("returns null path for unconnected tables (same table)", () => {
    const result = joinPath(fixture, "public.users", "public.users");
    expect(result.path).toEqual(["public.users"]);
  });

  it("throws for unknown table", () => {
    expect(() => joinPath(fixture, "public.nonexistent", "public.users")).toThrow();
  });
});

// --------------- getEnums ---------------

describe("getEnums", () => {
  it("returns all enums when no filter", () => {
    const result = getEnums(fixture);
    expect(Object.keys(result.enums)).toContain("public.order_status");
  });

  it("filters by name", () => {
    const result = getEnums(fixture, "order_status");
    expect(Object.keys(result.enums)).toContain("public.order_status");
    expect(result.enums["public.order_status"]!.values).toContain("pending");
  });

  it("returns empty object for nonexistent enum", () => {
    const result = getEnums(fixture, "nonexistent_enum");
    expect(Object.keys(result.enums)).toHaveLength(0);
  });
});

// --------------- getPolicies ---------------

describe("getPolicies", () => {
  it("returns all policies when no table specified", () => {
    const result = getPolicies(fixture);
    expect(result.policies.length).toBeGreaterThan(0);
  });

  it("filters by table", () => {
    const result = getPolicies(fixture, "public.orders");
    expect(result.policies.every((p) => p.table === "public.orders")).toBe(true);
    expect(result.policies[0]!.policy.name).toBe("orders_user_policy");
  });

  it("returns empty for table with no policies", () => {
    const result = getPolicies(fixture, "public.users");
    expect(result.policies).toHaveLength(0);
  });
});

// --------------- buildStatus ---------------

describe("buildStatus", () => {
  it("calculates snapshot age string", () => {
    const fp = {
      tables: {},
      enumsHash: "",
      verifiedAt: new Date(Date.now() - 90 * 1000).toISOString(), // 90s ago
    };
    const status = buildStatus("test-id", fp, fixture, true);
    expect(status.snapshotAge).toBe("1m ago");
    expect(status.dbReachable).toBe(true);
    expect(status.stale).toBe(false);
  });

  it("marks stale when db unreachable and fingerprint exists", () => {
    const fp = {
      tables: {},
      enumsHash: "",
      verifiedAt: new Date().toISOString(),
    };
    const status = buildStatus("test-id", fp, fixture, false);
    expect(status.stale).toBe(true);
  });
});
