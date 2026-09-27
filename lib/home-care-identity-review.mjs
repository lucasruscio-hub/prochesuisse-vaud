const scopes = new Set([
  "national_organization",
  "cantonal_organization",
  "regional_network",
  "local_operating_unit",
  "office",
  "franchise",
  "historical_brand",
  "care_provider",
]);
const actions = new Set([
  "keep",
  "rename_later",
  "split_later",
  "link_as_organization",
  "supersede_historically",
  "hold",
]);
const nonempty = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const exactKeys = (object, keys, label) => {
  if (!object || typeof object !== "object" || Array.isArray(object)
    || Object.keys(object).length !== keys.length
    || Object.keys(object).some((key) => !keys.includes(key))) {
    throw new Error(`Unexpected ${label} shape`);
  }
};
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
};

export function normalizeIdentityResearch(raw, baseline) {
  exactKeys(raw, ["researchPacketVersion", "legacyIdentity", "reviewState", "approval", "proposedIdentity",
    "sources", "conclusions", "unresolved", "recommendation", "dataWrites"], "identity research packet");
  exactKeys(raw.legacyIdentity, ["legacyId", "slug", "name", "primaryType", "locality", "postalCode",
    "originalLocationText", "legacyTags"], "legacy identity");
  exactKeys(raw.approval, ["localApply", "publish", "verify"], "approval");
  exactKeys(raw.proposedIdentity, ["publicName", "legalOrganization", "brand", "scopes", "contactIdentity",
    "organizationRelationship"], "proposed identity");
  exactKeys(raw.recommendation, ["actions", "oneRecordDisposition", "reasoning"], "recommendation");
  const expectedLegacy = {
    legacyId: baseline?.legacy_id,
    slug: baseline?.slug,
    name: baseline?.name,
    primaryType: baseline?.primary_type,
    locality: baseline?.locality,
    postalCode: baseline?.postal_code,
    originalLocationText: baseline?.original_location_text,
    legacyTags: baseline?.original_tags,
  };
  if (raw.researchPacketVersion !== 1
    || raw.reviewState !== "identity_researched_pending_human_review"
    || Object.values(raw.approval).some((value) => value !== false)
    || JSON.stringify(raw.legacyIdentity) !== JSON.stringify(expectedLegacy)
    || !Array.isArray(raw.dataWrites) || raw.dataWrites.length !== 0) {
    throw new Error("Identity packet baseline or safety gate mismatch");
  }
  if (!nonempty(raw.proposedIdentity.publicName)
    || !nonempty(raw.proposedIdentity.legalOrganization)
    || !nonempty(raw.proposedIdentity.brand)
    || !Array.isArray(raw.proposedIdentity.scopes) || !raw.proposedIdentity.scopes.length
    || raw.proposedIdentity.scopes.some((scope) => !scopes.has(scope))
    || !nonempty(raw.proposedIdentity.contactIdentity)
    || !nonempty(raw.proposedIdentity.organizationRelationship)) {
    throw new Error("Invalid proposed identity");
  }
  if (!Array.isArray(raw.sources) || !raw.sources.length) throw new Error("Identity packet needs sources");
  const sourceIds = new Set();
  for (const source of raw.sources) {
    exactKeys(source, ["id", "title", "url", "accessedOn", "authority", "temporalContext"], "source");
    if (!nonempty(source.id) || sourceIds.has(source.id) || !nonempty(source.title)
      || !validUrl(source.url) || !validDate(source.accessedOn)
      || !["official_provider", "official_organization", "official_public_authority"].includes(source.authority)
      || !["current", "historical"].includes(source.temporalContext)) throw new Error("Invalid source provenance");
    sourceIds.add(source.id);
  }
  if (!Array.isArray(raw.conclusions) || !raw.conclusions.length) throw new Error("Identity packet needs conclusions");
  for (const conclusion of raw.conclusions) {
    exactKeys(conclusion, ["key", "statement", "confidence", "ambiguity", "sourceIds"], "conclusion");
    if (!nonempty(conclusion.key) || !nonempty(conclusion.statement)
      || !["high", "medium", "low"].includes(conclusion.confidence)
      || !(conclusion.ambiguity === null || nonempty(conclusion.ambiguity))
      || !Array.isArray(conclusion.sourceIds) || !conclusion.sourceIds.length
      || conclusion.sourceIds.some((id) => !sourceIds.has(id))) throw new Error("Invalid sourced conclusion");
  }
  if (!Array.isArray(raw.unresolved) || raw.unresolved.some((item) => !nonempty(item))
    || !Array.isArray(raw.recommendation.actions) || !raw.recommendation.actions.length
    || raw.recommendation.actions.some((action) => !actions.has(action))
    || !nonempty(raw.recommendation.oneRecordDisposition)
    || !Array.isArray(raw.recommendation.reasoning) || !raw.recommendation.reasoning.length
    || raw.recommendation.reasoning.some((item) => !nonempty(item))) throw new Error("Invalid recommendation");
  return {
    version: 1,
    identity: structuredClone(raw.legacyIdentity),
    approval: { localApply: false, publish: false, verify: false },
    proposedIdentity: structuredClone(raw.proposedIdentity),
    evidence: structuredClone(raw.sources),
    conclusions: structuredClone(raw.conclusions),
    unresolved: [...raw.unresolved],
    recommendation: structuredClone(raw.recommendation),
    dataWrites: [],
  };
}

export function validateCanonicalIdentityPacket(packet, baseline) {
  exactKeys(packet, ["version", "identity", "approval", "proposedIdentity", "evidence", "conclusions",
    "unresolved", "recommendation", "dataWrites"], "canonical identity packet");
  const research = {
    researchPacketVersion: packet.version,
    legacyIdentity: packet.identity,
    reviewState: "identity_researched_pending_human_review",
    approval: packet.approval,
    proposedIdentity: packet.proposedIdentity,
    sources: packet.evidence,
    conclusions: packet.conclusions,
    unresolved: packet.unresolved,
    recommendation: packet.recommendation,
    dataWrites: packet.dataWrites,
  };
  normalizeIdentityResearch(research, baseline);
  return { valid: true, databaseWrites: 0, sourceCount: packet.evidence.length,
    conclusionCount: packet.conclusions.length };
}
