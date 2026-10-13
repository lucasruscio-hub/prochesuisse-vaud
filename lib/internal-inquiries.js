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

  const [contactResult, activitiesResult, municipalityResult] = await Promise.all([
    supabase.from("inquiry_contacts").select(
      "first_name,last_name,email,phone,preferred_contact_method,anonymized_at",
    ).eq("id", inquiry.primary_contact_id).single(),
    supabase.from("inquiry_activities").select(
      "id,activity_type,actor_type,actor_label,from_status,to_status,note_text,occurred_at,created_at",
    ).eq("inquiry_id", id).order("occurred_at", { ascending: true }).order("id", { ascending: true }),
    inquiry.municipality_id
      ? supabase.from("municipalities").select("official_name,bfs_number").eq("id", inquiry.municipality_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (contactResult.error) databaseError("detail contact", contactResult.error);
  if (activitiesResult.error) databaseError("detail activities", activitiesResult.error);
  if (municipalityResult.error) databaseError("detail municipality", municipalityResult.error);

  return projectInquiryDetail(
    inquiry, contactResult.data, activitiesResult.data, municipalityResult.data,
  );
}
