import "server-only";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { providers } from "./providers.js";

const localPreviewSlugs = new Set(providers.map((provider) => provider.id));

/** Run the existing pinned-container helper in native Node, outside Next's bundler. */
export function readLocalReviewedProvider(slug) {
  if (process.env.NODE_ENV !== "development" || slug === "nova-via" || !localPreviewSlugs.has(slug)) return null;
  const script = resolve(process.cwd(), "scripts", "read-local-provider-detail.mjs");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(DOCKER_|PG|SUPABASE_|DATABASE_URL$)/i.test(key)));
  const result = spawnSync(process.execPath, [script, slug], {
    cwd: process.cwd(), env, encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  return JSON.parse(result.stdout.trim());
}
