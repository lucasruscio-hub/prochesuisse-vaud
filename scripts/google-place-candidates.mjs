import nextEnv from "@next/env";
import { searchGooglePlaceCandidates } from "../lib/google-places-core.js";

nextEnv.loadEnvConfig(process.cwd(), true);
const slug = process.argv[2];
if (slug !== "ems-boveresses") {
  console.error("Usage: node scripts/google-place-candidates.mjs ems-boveresses");
  process.exitCode = 1;
} else if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Set GOOGLE_PLACES_API_KEY in .env.local before searching.");
  process.exitCode = 1;
} else {
  try {
    const candidates = await searchGooglePlaceCandidates("Tertianum Les Boveresses Lausanne 1010 Suisse");
    console.log(JSON.stringify({ slug, candidates, selected: null,
      next: "Review identity and site on Google Maps, then manually edit the ignored local approval file." }, null, 2));
  } catch {
    console.error("Google Places candidate search failed. Check API enablement, key restrictions and billing.");
    process.exitCode = 1;
  }
}
