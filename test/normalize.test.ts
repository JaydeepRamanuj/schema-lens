// ============================================================
// normalize.test.ts — unit tests for the normalize function.
// Verifies raw extractor output → NormalizedSchema conversion.
// No DB required.
// ============================================================

import { describe, it, expect } from "vitest";
import { normalize } from "../src/core/normalize.js";
import type { ExtractorOutput } from "../src/core/extractor/custom.js";

// --------------- Minimal fixture ---------------

const rawOutput: ExtractorOutput = {
  tables: [
    { schema: "public", name: "users", type: "table", rls_enabled: false, rls_forced: false, comment: "App users" },
    { schema: "public", name: "posts", type: "table", rls_enabled: true, rls_forced: false, comment: null },
  ],
  columns: [
    { schema: "public", table: "users", attnum: 1, name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", comment: null },
    { schema: "public", table: "users", attnum: 2, name: "email", type: "text", nullable: false, default: null, comment: "User email" },
    { schema: "public", table: "posts", attnum: 1, name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", comment: null },
    { schema: "public", table: "posts", attnum: 2, name: "author_id", type: "uuid", nullable: false, default: null, comment: null },
  ],
  constraints: [
    { schema: "public", table: "users", name: "users_pkey", type: "PRIMARY KEY", columns: ["id"], ref_schema: null, ref_table: null, ref_columns: [], on_delete: null, on_update: null, def: "PRIMARY KEY (id)" },
    { schema: "public", table: "users", name: "users_email_key", type: "UNIQUE", columns: ["email"], ref_schema: null, ref_table: null, ref_columns: [], on_delete: null, on_update: null, def: "UNIQUE (email)" },
    { schema: "public", table: "posts", name: "posts_pkey", type: "PRIMARY KEY", columns: ["id"], ref_schema: null, ref_table: null, ref_columns: [], on_delete: null, on_update: null, def: "PRIMARY KEY (id)" },
    { schema: "public", table: "posts", name: "posts_author_fkey", type: "FOREIGN KEY", columns: ["author_id"], ref_schema: "public", ref_table: "users", ref_columns: ["id"], on_delete: "CASCADE", on_update: "NO ACTION", def: "FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE" },
  ],
  indexes: [
    { schema: "public", table: "posts", name: "posts_author_idx", unique: false, columns: ["author_id"], def: "CREATE INDEX posts_author_idx ON public.posts USING btree (author_id)" },
  ],
  triggers: [
    { schema: "public", table: "posts", name: "posts_updated_at", timing: "BEFORE", def: "CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_timestamp()" },
  ],
  policies: [
    { schema: "public", table: "posts", name: "posts_owner", permissive: true, roles: ["authenticated"], cmd: "ALL", qual: "(author_id = auth.uid())", with_check: "(author_id = auth.uid())" },
  ],
  enums: [
    { schema: "public", name: "post_status", values: ["draft", "published", "archived"] },
  ],
};

const meta = {
  connectionId: "test-conn",
  dbName: "testdb",
  generatedAt: "2026-10-01T10:00:00.000Z",
};

// --------------- Tests ---------------

describe("normalize", () => {
  it("produces valid meta", () => {
    const result = normalize(rawOutput, meta);
    expect(result.meta.extractor).toBe("custom");
    expect(result.meta.snapshotVersion).toBe(1);
    expect(result.meta.connectionId).toBe("test-conn");
  });

  it("canonicalizes table keys to schema.tablename", () => {
    const result = normalize(rawOutput, meta);
    expect(Object.keys(result.tables)).toContain("public.users");
    expect(Object.keys(result.tables)).toContain("public.posts");
  });

  it("assigns columns to correct tables in order", () => {
    const result = normalize(rawOutput, meta);
    const userCols = result.tables["public.users"]!.columns;
    expect(userCols).toHaveLength(2);
    expect(userCols[0]!.name).toBe("id");
    expect(userCols[1]!.name).toBe("email");
    expect(userCols[1]!.comment).toBe("User email");
  });

  it("normalizes FK constraint with references", () => {
    const result = normalize(rawOutput, meta);
    const postConstraints = result.tables["public.posts"]!.constraints;
    const fk = postConstraints.find((c) => c.type === "FOREIGN KEY");
    expect(fk).toBeDefined();
    expect(fk?.references?.table).toBe("public.users");
    expect(fk?.references?.columns).toContain("id");
    expect(fk?.onDelete).toBe("CASCADE");
  });

  it("attaches indexes to correct table", () => {
    const result = normalize(rawOutput, meta);
    const postIndexes = result.tables["public.posts"]!.indexes;
    expect(postIndexes).toHaveLength(1);
    expect(postIndexes[0]!.name).toBe("posts_author_idx");
    expect(postIndexes[0]!.unique).toBe(false);
  });

  it("parses trigger events from def string", () => {
    const result = normalize(rawOutput, meta);
    const trigger = result.tables["public.posts"]!.triggers[0];
    expect(trigger).toBeDefined();
    expect(trigger?.timing).toBe("BEFORE");
    expect(trigger?.events).toContain("UPDATE");
  });

  it("attaches policies to correct table", () => {
    const result = normalize(rawOutput, meta);
    const policy = result.tables["public.posts"]!.policies[0];
    expect(policy).toBeDefined();
    expect(policy?.name).toBe("posts_owner");
    expect(policy?.cmd).toBe("ALL");
    expect(policy?.qual).toBe("(author_id = auth.uid())");
  });

  it("builds relations graph in both directions", () => {
    const result = normalize(rawOutput, meta);

    // posts references users (outgoing FK)
    expect(result.relations["public.posts"]?.references).toContain("public.users");
    // users is referencedBy posts (incoming FK)
    expect(result.relations["public.users"]?.referencedBy).toContain("public.posts");
  });

  it("maps enums with schema prefix", () => {
    const result = normalize(rawOutput, meta);
    expect(result.enums["public.post_status"]).toBeDefined();
    expect(result.enums["public.post_status"]!.values).toEqual(["draft", "published", "archived"]);
  });

  it("sets rlsEnabled correctly", () => {
    const result = normalize(rawOutput, meta);
    expect(result.tables["public.users"]!.rlsEnabled).toBe(false);
    expect(result.tables["public.posts"]!.rlsEnabled).toBe(true);
  });

  it("handles null comment gracefully", () => {
    const result = normalize(rawOutput, meta);
    expect(result.tables["public.posts"]!.comment).toBeNull();
    expect(result.tables["public.users"]!.comment).toBe("App users");
  });
});
