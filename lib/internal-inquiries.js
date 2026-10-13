import "server-only";
import { supabase } from "@/lib/supabase";
import {
  isInquiryStatus, projectInquiryDetail, projectInquirySummaries,
} from "@/lib/lia-inquiry-domain.mjs";

function databaseError(context, error) {
  console.error(`Internal inquiry ${context} failed`, error?.code ?? "unknown");
  throw new Error("INTERNAL_INQUIRY_DATABASE_ERROR");
}

export async function listInternalInquiries(status) {
  let query = supabase.from("inquiries").select(
    "id,primary_contact_id,care_type_code,location_text,timing_code,workflow_status,submitted_at,last_activity_at",
  ).limit(200);
  if (status && isInquiryStatus(status)) query = query.eq("workflow_status", status);
  const { data: inquiries, error } = await query;
  if (error) databaseError("list", error);
  const contactIds = [...new Set(inquiries.map((item) => item.primary_contact_id))];
  const { data: contacts, error: contactError } = contactIds.length
    ? await supabase.from("inquiry_contacts").select("id,first_name,last_name").in("id", contactIds)
    : { data: [], error: null };
  if (contactError) databaseError("list contacts", contactError);
  return projectInquirySummaries(inquiries, contacts);
}

export async function getInternalInquiry(id) {
  const { data: inquiry, error } = await supabase.from("inquiries").select(
    "id,primary_contact_id,care_type_code,beneficiary_relation_code,timing_code,need_codes,location_text,postal_code,municipality_id,context_summary,workflow_status,closure_outcome_code,source_channel,source_detail,landing_page,contact_permission_at,contact_permission_withdrawn_at,privacy_notice_version,privacy_acknowledged_at,provider_sharing_permission_status,provider_sharing_permission_at,provider_sharing_permission_withdrawn_at,submitted_at,closed_at,last_activity_at",
  ).eq("id", id).maybeSingle();
  if (error) databaseError("detail", error);
  if (!inquiry) return null;

  const [contactResult, activitiesResult, municipalityResult, referralsResult] = await Promise.all([
    supabase.from("inquiry_contacts").select(
      "first_name,last_name,email,phone,preferred_contact_method,anonymized_at",
    ).eq("id", inquiry.primary_contact_id).single(),
    supabase.from("inquiry_activities").select(
      "id,referral_id,activity_type,actor_type,actor_label,from_status,to_status,note_text,event_data,occurred_at,created_at",
    ).eq("inquiry_id", id).order("occurred_at", { ascending: true }).order("id", { ascending: true }),
    inquiry.municipality_id
      ? supabase.from("municipalities").select("official_name,bfs_number").eq("id", inquiry.municipality_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("inquiry_referrals").select(
      "id,recipient_organization_id,provider_id,care_offering_id,referral_status,outcome_code,sharing_authorization_basis,sharing_authorized_at,sharing_authorization_withdrawn_at,shared_at,responded_at,converted_at,closed_at,created_at,updated_at",
    ).eq("inquiry_id", id).order("created_at", { ascending: true }),
  ]);
  if (contactResult.error) databaseError("detail contact", contactResult.error);
  if (activitiesResult.error) databaseError("detail activities", activitiesResult.error);
  if (municipalityResult.error) databaseError("detail municipality", municipalityResult.error);
  if (referralsResult.error) databaseError("detail referrals", referralsResult.error);

  const referrals = referralsResult.data;
  const organizationIds = [...new Set(referrals.map((item) => item.recipient_organization_id))];
  const providerIds = [...new Set(referrals.map((item) => item.provider_id).filter(Boolean))];
  const offeringIds = [...new Set(referrals.map((item) => item.care_offering_id).filter(Boolean))];
  const [organizationsResult, providersResult, offeringsResult] = await Promise.all([
    organizationIds.length ? supabase.from("organizations").select("id,name").in("id", organizationIds) : { data: [], error: null },
    providerIds.length ? supabase.from("providers").select("id,name,locality,postal_code,primary_type").in("id", providerIds) : { data: [], error: null },
    offeringIds.length ? supabase.from("care_offerings").select("id,name,offering_type").in("id", offeringIds) : { data: [], error: null },
  ]);
  if (organizationsResult.error || providersResult.error || offeringsResult.error) databaseError(
    "detail referral targets", organizationsResult.error || providersResult.error || offeringsResult.error,
  );
  const byId = (items) => new Map(items.map((item) => [item.id, item]));
  const organizations = byId(organizationsResult.data);
  const providers = byId(providersResult.data);
  const offerings = byId(offeringsResult.data);
  const projectedReferrals = referrals.map((item) => ({
    ...item,
    recipientOrganization: organizations.get(item.recipient_organization_id) ?? null,
    provider: item.provider_id ? providers.get(item.provider_id) ?? null : null,
    careOffering: item.care_offering_id ? offerings.get(item.care_offering_id) ?? null : null,
  }));

  return { ...projectInquiryDetail(
    inquiry, contactResult.data, activitiesResult.data, municipalityResult.data,
  ), referrals: projectedReferrals };
}

export async function searchEligibleReferralTargets(searchText) {
  const term = String(searchText ?? "").trim().slice(0, 100).replace(/[(),]/g, " ").replace(/\s+/g, " ");
  if (term.length < 2) return [];
  const escaped = term.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const { data: providers, error } = await supabase.from("providers").select(
    "id,name,primary_type,locality,postal_code",
  ).eq("status", "active").or(`name.ilike.%${escaped}%,locality.ilike.%${escaped}%,postal_code.ilike.%${escaped}%`)
    .order("name").limit(30);
  if (error) databaseError("provider search", error);
  if (!providers.length) return [];
  const providerIds = providers.map((provider) => provider.id);
  const [relationsResult, offeringsResult] = await Promise.all([
    supabase.from("provider_organizations").select("provider_id,organization_id,relationship_type,is_primary")
      .in("provider_id", providerIds).in("relationship_type", ["operator", "owner", "brand"]),
    supabase.from("care_offerings").select("id,provider_id,name,offering_type")
      .in("provider_id", providerIds).eq("status", "active").order("name"),
  ]);
  if (relationsResult.error || offeringsResult.error) databaseError(
    "provider eligibility", relationsResult.error || offeringsResult.error,
  );
  const organizationIds = [...new Set(relationsResult.data.map((row) => row.organization_id))];
  const organizationsResult = organizationIds.length
    ? await supabase.from("organizations").select("id,name,status").in("id", organizationIds).eq("status", "active")
    : { data: [], error: null };
  if (organizationsResult.error) databaseError("provider organizations", organizationsResult.error);
  const organizations = new Map(organizationsResult.data.map((item) => [item.id, item]));
  const offerings = new Map();
  for (const item of offeringsResult.data) offerings.set(
    item.provider_id, [...(offerings.get(item.provider_id) ?? []), item],
  );
  const providerById = new Map(providers.map((item) => [item.id, item]));
  return relationsResult.data.filter((relation) => organizations.has(relation.organization_id)).map((relation) => ({
    provider: providerById.get(relation.provider_id),
    organization: organizations.get(relation.organization_id),
    relationshipType: relation.relationship_type,
    isPrimary: relation.is_primary,
    offerings: offerings.get(relation.provider_id) ?? [],
  })).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)
    || a.provider.name.localeCompare(b.provider.name, "fr"));
}
