# Phase 3B schema assessment (before any migration)

The Phase 1 `providers` row represents one listing with one `primary_type`, a flat `service_codes` array and a single `attributes` JSON object. `provider_sources.fields_supported` lists fields supported by a source, but there is no field-level evidence link, historical assertion record, or offering identifier. `provider_service_areas` supports only canton or municipality targets, not named regions.

The Nova Vita research describes one operation with both senior apartments and a separate medicalized care unit with its own capacity and attributes. A flat provider type, subtype or service array would blur the two offerings. Putting arbitrary offering JSON in `attributes` would create an unreviewed database contract without identities, provenance or constraints. **The current schema is insufficient for a complete Nova Vita application.** No migration is created in Phase 3B. The Nova Vita packet must remain held for structural review; do not silently flatten, split or merge it.

Other facts that cannot be applied cleanly yet:

- The source packets provide complete address strings, but not independently sourced street and house-number components. `original_location_text` must retain the legacy display text; it is not a verified-address field. Keep the researched address in the private review packet.
- Operator identity and bed/unit capacity lack typed columns and reviewed semantics. Do not turn them into arbitrary public `attributes` keys.
- Research service terms do not all match Lia's V1 service-code vocabulary. No automatic lexical mapping from the research or legacy tags is approved. Keep the sourced terms in the packet until a reviewed mapping exists.
- The Senevita regional evidence names Riviera, La Côte and a Lausanne/western region; these are not canton-wide or municipality-specific coverage facts. Do not create a canton VD service area or infer coverage from the Renens office.
- The research date is a date-only `accessed_on`; `provider_sources.retrieved_at` is a timestamp. Preserve the date in the private review packet and source notes, not as an invented time.

The safe local subset is a reviewed provider name, type, locality, postal code, canton where individually sourced, and contact fields, each with an explicit source. Those can be represented by the current provider row plus one or more private `provider_sources` rows with `fields_supported`. This is field-level provenance at the source-row granularity, not a durable claim history. Existing legacy tags stay in `original_tags`, unverified. Provider publication and verification states remain unchanged.

Before introducing a migration, design and review explicit offering identities and their relation to a provider/site; offering-level type, capacity, services and evidence; versioned field claims or equivalent source links; verified address semantics; and regional coverage representation. Decide whether Nova Vita is one site with two offerings or distinct licensed provider identities using authoritative evidence. That decision cannot be inferred from the pilot JSON structure.
