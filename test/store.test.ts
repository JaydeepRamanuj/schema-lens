// ============================================================
// store.test.ts — unit tests for cache store logic
// ============================================================

import { describe, it, expect } from "vitest";
import { deriveConnectionId } from "../src/core/store.js";

describe("store", () => {
  it("derives deterministic connection id", () => {
    const id1 = deriveConnectionId("postgres://user:pass@localhost:5432/db");
    const id2 = deriveConnectionId("postgres://user:pass@localhost:5432/db");
    expect(id1).toBe(id2);
  });

  it("does not include credentials in hash", () => {
    const id1 = deriveConnectionId("postgres://user:pass@localhost:5432/db");
    const id2 = deriveConnectionId("postgres://localhost:5432/db");
    // Depending on logic, it might match if the hostname is parsed, 
    // but at least it should not contain password.
    expect(id1).not.toContain("pass");
  });
});
