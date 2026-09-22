import { PROVIDER_TYPES } from "./provider-config.js";

const writable = new Set(["name", "primary_type", "postal_code", "locality", "canton_code", "phone", "email", "website"]);
const nonempty = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const exactKeys = (object, keys, label) => {
  if (!object || typeof object !== "object" || Array.isArray(object)
    || Object.keys(object).some((key) => !keys.includes(key))) throw new Error(`Unexpected ${label} shape`);
};
const validUrl = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash; }
  catch { return false; }
};
const phonePattern = /^(?:\+41|0)[0-9\s().-]{8,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evidence(source, field) {
  exactKeys(source, ["type", "name", "url", "accessed_on"], `${field} source`);
  if (source.type !== "official_web" || !nonempty(source.name) || !validUrl(source.url)
    || !/^\d{4}-\d{2}-\d{2}$/.test(source.accessed_on)
    || Number.isNaN(Date.parse(`${source.accessed_on}T00:00:00Z`))) throw new Error(`Missing/invalid provenance: ${field}`);
  return { kind: new URL(source.url).hostname === "www.vd.ch" ? "public" : "provider",
    name: source.name, url: source.url, accessedOn: source.accessed_on };
}

export function normalizeResearchPacket(raw, baseline) {
  exactKeys(raw, ["research_packet_version", "legacy_id", "review_state", "publication_allowed", "verification_granted",
    "identity", "location", "office_location", "contact", "capacity", "verified_services", "verified_attributes",
    "care_offerings", "service_area", "dynamic_data", "legacy_tags", "legacy_tags_are_verified", "review_notes"], "research packet");
  if (raw.research_packet_version !== 1 || raw.review_state !== "human_researched_pending_local_apply"
    || raw.publication_allowed !== false || raw.verification_granted !== false || raw.legacy_tags_are_verified !== false
    || raw.legacy_id !== baseline?.legacy_id || !Array.isArray(raw.legacy_tags)
    || JSON.stringify(raw.legacy_tags) !== JSON.stringify(baseline.original_tags)) throw new Error("Research packet identity or safety gate mismatch");
  const claims = [];
  const unresolved = [];
  const claim = (field, item, target = null) => {
    if (item == null) return;
    exactKeys(item, ["value", "source", "review_note"], field);
    const value = item.value;
    if (!nonempty(value) && !(field.includes("capacity") && Number.isInteger(value) && value > 0)
      && !(field === "service_area.regions" && Array.isArray(value) && value.length && value.every(nonempty))) {
      throw new Error(`Invalid factual value: ${field}`);
    }
    if ((field === "contact.website" && !validUrl(value))
      || (field === "contact.email" && !emailPattern.test(value))
      || (field === "contact.phone" && !phonePattern.test(value))) throw new Error(`Malformed ${field}`);
    if (target && !writable.has(target)) throw new Error(`Unsupported target: ${target}`);
    claims.push({ field, value, evidence: evidence(item.source, field), target });
  };
  exactKeys(raw.identity, ["canonical_name", "provider_type", "operator"], "identity");
  claim("identity.name", raw.identity.canonical_name, "name");
  claim("identity.type", raw.identity.provider_type, "primary_type");
  if (!Object.hasOwn(PROVIDER_TYPES, raw.identity.provider_type.value)
    || raw.identity.provider_type.value !== baseline.primary_type) throw new Error("Unsupported or conflicting provider type");
  claim("identity.operator", raw.identity.operator);
  const location = raw.office_location ?? raw.location;
  if (!location || Boolean(raw.office_location) === Boolean(raw.location)) throw new Error("Exactly one site or office location required");
  exactKeys(location, ["address", "postal_code", "commune", "canton", "country_code", "latitude", "longitude"], "location");
  if (location.country_code !== "CH") throw new Error("Swiss scope required");
  const prefix = raw.office_location ? "office" : "site";
  claim(`${prefix}.address`, location.address);
  claim(`${prefix}.postalCode`, location.postal_code, "postal_code");
  claim(`${prefix}.locality`, location.commune, "locality");
  if (typeof location.canton === "object") claim(`${prefix}.canton`, location.canton, "canton_code");
  else if (location.canton != null) unresolved.push("canton has no field-level source; remains unknown");
  if (location.latitude != null || location.longitude != null) throw new Error("Coordinates need a separately reviewed location contract");
  exactKeys(raw.contact, ["phone", "email", "website"], "contact");
  for (const [key, target] of [["phone", "phone"], ["email", "email"], ["website", "website"]]) claim(`contact.${key}`, raw.contact[key], target);
  if (raw.capacity) { exactKeys(raw.capacity, ["beds"], "capacity"); claim("capacity.beds", raw.capacity.beds); }
  for (const [field, items] of [["service", raw.verified_services ?? []], ["attribute", raw.verified_attributes ?? []]]) {
    if (!Array.isArray(items)) throw new Error(`Invalid ${field} list`);
    for (const item of items) claim(`${field}.${item?.value ?? "unknown"}`, item);
  }
  const offerings = (raw.care_offerings ?? []).map((offering) => {
    exactKeys(offering, ["offering_type", "publication_allowed", "capacity", "attributes"], "offering");
    if (!nonempty(offering.offering_type) || offering.publication_allowed !== false) throw new Error("Unsafe offering");
    if (offering.capacity) claim(`offering.${offering.offering_type}.capacity`, offering.capacity);
    for (const item of offering.attributes ?? []) claim(`offering.${offering.offering_type}.${item.value}`, item);
    return offering.offering_type;
  });
  if (raw.service_area) {
    exactKeys(raw.service_area, ["status", "verified_regional_evidence", "municipalities", "review_note"], "service area");
    if (raw.service_area.status !== "not_yet_structured" || raw.service_area.municipalities.length) throw new Error("Unsupported structured coverage");
    claim("service_area.regions", raw.service_area.verified_regional_evidence);
  }
  if (raw.dynamic_data && raw.dynamic_data.availability != null) throw new Error("Dynamic availability cannot be durable enrichment");
  const holdReasons = offerings.length > 1 ? ["multiple care offerings require a reviewed schema/identity decision"] : [];
  return { version: 1, identity: { legacyId: baseline.legacy_id, slug: baseline.slug,
    expectedName: baseline.name, expectedType: baseline.primary_type },
    approval: { localApply: false, publish: false, verify: false },
    locationKind: prefix, claims, offerings, unresolved, holdReasons,
    legacyTags: [...raw.legacy_tags], legacyTagsVerified: false };
}

export function validateReviewPacket(packet, baseline) {
  exactKeys(packet, ["version", "identity", "approval", "locationKind", "claims", "offerings", "unresolved",
    "holdReasons", "legacyTags", "legacyTagsVerified"], "canonical packet");
  exactKeys(packet.identity, ["legacyId", "slug", "expectedName", "expectedType"], "canonical identity");
  exactKeys(packet.approval, ["localApply", "publish", "verify"], "approval");
  if (packet.version !== 1 || packet.approval?.publish !== false || packet.approval?.verify !== false
    || typeof packet.approval.localApply !== "boolean" || packet.legacyTagsVerified !== false
    || packet.identity.legacyId !== baseline?.legacy_id || packet.identity.slug !== baseline.slug
    || packet.identity.expectedName !== baseline.name || packet.identity.expectedType !== baseline.primary_type
    || JSON.stringify(packet.legacyTags) !== JSON.stringify(baseline.original_tags)
    || !Array.isArray(packet.claims) || !Array.isArray(packet.offerings) || !Array.isArray(packet.holdReasons)
    || !["site", "office"].includes(packet.locationKind)) {
    throw new Error("Canonical packet safety/identity mismatch");
  }
  const targets = new Set();
  for (const item of packet.claims) {
    exactKeys(item, ["field", "value", "evidence", "target"], "claim");
    exactKeys(item.evidence, ["kind", "name", "url", "accessedOn"], "claim evidence");
    if (!nonempty(item.field) || !item.evidence || !nonempty(item.evidence.name)
      || !validUrl(item.evidence.url) || !["provider", "public"].includes(item.evidence.kind)
      || !/^\d{4}-\d{2}-\d{2}$/.test(item.evidence.accessedOn)) throw new Error("Factual claim lacks valid provenance");
    const expectedTarget = {
      "identity.name": "name", "identity.type": "primary_type",
      "site.postalCode": "postal_code", "office.postalCode": "postal_code",
      "site.locality": "locality", "office.locality": "locality",
      "site.canton": "canton_code", "office.canton": "canton_code",
      "contact.phone": "phone", "contact.email": "email", "contact.website": "website",
    }[item.field] ?? null;
    if (item.target !== expectedTarget) throw new Error("Claim target/field mismatch");
    if (item.target) {
      if (!writable.has(item.target) || targets.has(item.target)) throw new Error("Unsupported/duplicate target");
      targets.add(item.target);
      if ((item.target === "primary_type" && (!Object.hasOwn(PROVIDER_TYPES, item.value) || item.value !== baseline.primary_type))
        || (item.target === "canton_code" && !/^(AG|AI|AR|BE|BL|BS|FR|GE|GL|GR|JU|LU|NE|NW|OW|SG|SH|SO|SZ|TG|TI|UR|VD|VS|ZG|ZH)$/.test(item.value))
        || (item.target === "postal_code" && !/^\d{4}$/.test(item.value))
        || (item.target === "email" && !emailPattern.test(item.value))
        || (item.target === "website" && !validUrl(item.value))
        || (item.target === "phone" && !phonePattern.test(item.value))
        || (typeof item.value === "string" && !nonempty(item.value))) throw new Error("Invalid reviewed field value");
    }
  }
  if (packet.locationKind === "office" && packet.claims.some((c) => c.target === "service_area")) throw new Error("Office location is not coverage");
  if (packet.approval.localApply && (packet.holdReasons.length || packet.offerings.length > 1)) throw new Error("Held packet cannot be locally applied");
  return { valid: true, localApplyReady: packet.approval.localApply && !packet.holdReasons.length && packet.offerings.length <= 1,
    writableFields: [...targets], deferredClaims: packet.claims.filter((c) => !c.target).length };
}
