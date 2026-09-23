# Phase 3C.2 local Google Places preview

This pilot is limited to the reviewed local `ems-boveresses` row. Google content is a separate, temporary detail-page source. It does not change Lia identity, contact, care facts, verification, publication, service coverage, Supabase, or the public search index. No Place ID is approved in the checked-in example.

## Google Cloud setup

Enable **Places API (New)** and **Maps Embed API** in a billing-enabled Google Cloud project. Create separate keys:

- `GOOGLE_PLACES_API_KEY`: server-side Places web-service key. Restrict to Places API (New); restrict by server IP where feasible. Never use a `NEXT_PUBLIC_` prefix.
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`: browser-visible Maps Embed API key. Restrict to Maps Embed API and local HTTP referrers such as `http://localhost:3000/*` and `http://127.0.0.1:3000/*` (and later only explicitly approved site domains).

Copy the variable names from `.env.example` into ignored `.env.local`, then set `LIA_PROVIDER_DETAIL_SOURCE=local` and `LIA_GOOGLE_PLACES_PREVIEW=1`. Keep both keys out of commits, logs and screenshots. Restart the dev server after changing environment variables. The local reviewed-provider reader must be working as in Phase 3C.1.

## Find and approve a site

Run from the project root:

```powershell
node scripts/google-place-candidates.mjs ems-boveresses
```

The command calls Places Text Search (New) with a limited field mask and prints up to five candidate names, addresses, IDs and Google Maps links. It does **not** select or save one. Compare the candidate's Google Maps page, site name, address and identity to the reviewed Lia establishment. If none is clearly the same site, leave this pilot held.

For an established match, copy `config/google-place-approvals.example.json` to the ignored `config/google-place-approvals.local.json` and manually change only the `ems-boveresses` entry: set `status` to `approved`, insert the exact candidate `placeId`, and fill `reviewedBy`, `reviewedOn` (`YYYY-MM-DD`) and `identityNote` describing the evidence. The approval loader rejects incomplete entries, other slugs, nondevelopment mode and preview opt-out. The file is intentionally local and later maps to a **site-level** Place ID, not a provider-wide database field.

## Preview

```powershell
npm.cmd run dev
```

Open `http://localhost:3000/prestataires/ems-boveresses`. Before approval, the page shows the reviewed Lia identity/contact and its sparse hero, with no Google content. After approval and key setup, only this detail page asks Places for fresh rich data. If Google is unavailable, the Lia detail remains visible. The map requires the separate Embed key; photos and reviews appear only when returned with usable attribution and source links. Search-result pages make no rich Places requests.

The server requests fresh Place Details (New) with an explicit rich field mask, then fresh Photo Media URLs for at most four returned photos. It uses `no-store`, persists no Google response, photo resource name or review, and renders photos directly from Google. The image/review links and author attribution stay with the Google content. Google ratings/reviews do not verify care facts. Google addresses and phones are deliberately ignored by the Lia detail projection. `Avis Lia` has its own source.

Before any public rollout, review Google Maps Platform terms and attribution presentation, approved domain/referrer restrictions, key quotas/budget alerts, Privacy Policy/Terms references, and the long-term site-level matching model. This local foundation does not approve a public rollout.
