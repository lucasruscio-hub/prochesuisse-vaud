import "server-only";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { LOCAL_DETAIL_PILOTS } from "./provider-local-projection.js";

/** Run the existing pinned-container helper in native Node, outside Next's bundler. */
export function readLocalReviewedProvider(slug) {
  if (process.env.NODE_ENV !== "development" || !LOCAL_DETAIL_PILOTS.includes(slug)) return null;
  const script = resolve(process.cwd(), "scripts", "read-local-provider-detail.mjs");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(DOCKER_|PG|SUPABASE_|DATABASE_URL$)/i.test(key)));
  const result = spawnSync(process.execPath, [script, slug], {
    cwd: process.cwd(), env, encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  return JSON.parse(result.stdout.trim());
}
