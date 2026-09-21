import { PROVIDER_TYPES, PROVIDER_SOURCE_TYPES } from "./provider-config.js";

const cantons = new Set("AG AI AR BE BL BS FR GE GL GR JU LU NE NW OW SG SH SO SZ TG TI UR VD VS ZG ZH".split(" "));
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const nullable = (value) => nonempty(value) ? value : null;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Pure Swiss source-adapter contract. No I/O, credentials, clock or generated UUIDs.
 * Records: id, optional slug, name, type, commune, npa, address, tags,
 * optional explicitly evidenced canton_code. Unknown geography stays null.
 * Source metadata and structured review notes are adapter responsibilities.
 * reviewNotes[id]: { verificationNotes: string[], specialReviewConcerns: string[] }.
 */
export function inspectProviderDataset(records, { source, reviewNotes = {} } = {}) {
  if (!Array.isArray(records)) throw new TypeError("Expected an array of source records");
  if (!source || !nonempty(source.name) || !PROVIDER_SOURCE_TYPES.includes(source.type)) {
    throw new TypeError("Explicit source name and supported source type required");
  }
  if (source.url != null && !nonempty(source.url)) throw new TypeError("Invalid source URL");
  const duplicateValues = (field) => {
    const indices = new Map();
    records.forEach((record, index) => {
      const value = field(record);
      if (nonempty(value)) indices.set(value, [...(indices.get(value) ?? []), index]);
    });
    return [...indices].filter(([, positions]) => positions.length > 1)
      .map(([value, indices]) => ({ value, indices }));
  };
  const slugOf = (record) => record?.slug ?? record?.id;
  const duplicateLegacyIds = duplicateValues((record) => record?.id);
  const duplicateSlugs = duplicateValues(slugOf);
  const duplicateIds = new Set(duplicateLegacyIds.map(({ value }) => value));
  const duplicatedSlugs = new Set(duplicateSlugs.map(({ value }) => value));
  const countsByCategory = { ems: 0, domicile: 0, residence: 0, unknown: 0 };
  const rows = records.map((record, index) => {
    const p = record ?? {};
    const errors = [];
    if (!nonempty(p.id)) errors.push("missing_or_invalid_legacy_id");
    if (!nonempty(p.name)) errors.push("missing_or_invalid_name");
    if (!Object.hasOwn(PROVIDER_TYPES, p.type)) errors.push("missing_or_unknown_type");
    else countsByCategory[p.type]++;
    if (!Object.hasOwn(PROVIDER_TYPES, p.type)) countsByCategory.unknown++;
    if (typeof slugOf(p) !== "string" || !slugPattern.test(slugOf(p))) errors.push("invalid_slug");
    if (duplicateIds.has(p.id)) errors.push("duplicate_legacy_id");
    if (duplicatedSlugs.has(slugOf(p))) errors.push("duplicate_slug");
    for (const field of ["commune", "npa", "address"]) {
      if (p[field] != null && typeof p[field] !== "string") errors.push(`invalid_${field}`);
    }
    if (p.tags != null && (!Array.isArray(p.tags) || p.tags.some((tag) => typeof tag !== "string"))) errors.push("invalid_tags");
    if (p.canton_code != null && !cantons.has(p.canton_code)) errors.push("invalid_swiss_canton");
    const review = Object.hasOwn(reviewNotes, p.id) ? reviewNotes[p.id] : {};
    const specialReviewConcerns = [...(review.specialReviewConcerns ?? [])];
    const verificationNotes = [
      "Legacy/source claims are unverified; confirm identity and address before publication.",
      ...(review.verificationNotes ?? []),
    ];
    if (p.canton_code == null) verificationNotes.push("Canton and official municipality remain unresolved.");
    if (p.type === "domicile") verificationNotes.push("Office locality is not service coverage; service areas remain empty.");
    const concerns = [...verificationNotes, ...specialReviewConcerns];
    const needsSpecialReview = specialReviewConcerns.length > 0;
    const provider = errors.length ? null : {
      legacy_id: p.id, slug: slugOf(p), name: p.name, primary_type: p.type,
      subtypes: [], country_code: "CH", canton_code: p.canton_code ?? null,
      municipality_id: null, postal_code: nullable(p.npa), locality: nullable(p.commune),
      original_location_text: nullable(p.address), original_tags: [...(p.tags ?? [])],
      street: null, house_number: null, latitude: null, longitude: null,
      phone: null, email: null, website: null, description: null,
      service_codes: [], language_codes: [], attributes: {},
      status: "active", verification_status: "unverified", is_published: false,
      last_reviewed_at: null,
    };
    const provenance = provider ? {
      source_type: source.type, source_name: source.name, source_url: source.url ?? null,
      external_record_id: p.id, retrieved_at: null, reviewed_at: null,
      fields_supported: ["legacy_id", "name", "primary_type",
        ...(provider.locality !== null ? ["locality"] : []),
        ...(provider.postal_code !== null ? ["postal_code"] : []),
        ...(provider.original_location_text !== null ? ["original_location_text"] : []),
        ...(p.tags != null ? ["original_tags"] : []),
        ...(p.canton_code != null ? ["canton_code"] : [])],
      notes: concerns.join(" "),
    } : null;
    return { index, legacyId: p.id ?? null, name: p.name ?? null, type: p.type ?? null,
      errors, concerns, verificationNotes, specialReviewConcerns, verificationRequired: true,
      needsSpecialReview, needsManualReview: needsSpecialReview, provider,
      // Bind provider_id after a future writer receives the database UUID.
      source: provenance, serviceAreas: [] };
  });
  const rejected = rows.filter((row) => row.errors.length);
  return {
    summary: {
      totalSourceRecords: records.length, countsByCategory,
      validRecords: records.length - rejected.length, rejectedRecords: rejected.length,
      duplicateLegacyIds, duplicateSlugs,
      missingNames: rows.filter((row) => row.errors.includes("missing_or_invalid_name")).map((row) => row.index),
      missingOrInvalidTypes: rows.filter((row) => row.errors.includes("missing_or_unknown_type")).map((row) => row.index),
      recordsRequiringVerification: rows.filter((row) => row.verificationRequired).length,
      recordsNeedingSpecialReview: rows.filter((row) => row.needsSpecialReview).length,
      recordsNeedingManualReview: rows.filter((row) => row.needsManualReview).length,
    }, rows,
  };
}

/** Strict transform: never return a partial import batch when validation fails. */
export function transformProviderDataset(records, options) {
  const result = inspectProviderDataset(records, options);
  if (result.summary.rejectedRecords) {
    throw new Error(`Provider ingestion rejected: ${JSON.stringify(result.rows.filter((row) => row.errors.length).map(({ index, errors }) => ({ index, errors })))}`);
  }
  return result.rows.map(({ provider, source, serviceAreas }) => ({ provider, source, serviceAreas }));
}
