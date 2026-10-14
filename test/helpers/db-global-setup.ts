// ============================================================
// helpers/db-global-setup.ts — vitest globalSetup for integration tests.
// CI: uses the Postgres service container from DBCTX_TEST_URL.
// Local (no Docker): starts an in-process PGlite socket server on a free port.
// ============================================================

import type { GlobalSetupContext } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbAdminUrl: string;
  }
}

export default async function setup({ provide }: GlobalSetupContext) {
  const externalUrl = process.env["DBCTX_TEST_URL"];
  if (externalUrl) {
    provide("dbAdminUrl", externalUrl);
    return;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0, maxConnections: 4 });
  await server.start();
  provide("dbAdminUrl", `postgres://postgres:postgres@${server.getServerConn()}/postgres`);

  return async () => {
    await server.stop();
    await db.close();
  };
}
