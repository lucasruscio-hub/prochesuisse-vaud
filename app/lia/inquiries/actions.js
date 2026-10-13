"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLiaStaff } from "@/lib/lia-auth";
import { supabase } from "@/lib/supabase";
import { isClosureOutcome, isInquiryStatus } from "@/lib/lia-inquiry-domain.mjs";
import {
  REFERRAL_CLOSED_OUTCOMES, REFERRAL_SUCCESS_OUTCOMES,
} from "@/lib/lia-inquiry-domain.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function detailUrl(id, kind, message) {
  const url = new URL(`/lia/inquiries/${id}`, "https://lia.internal");
  url.searchParams.set(kind, message);
  return `${url.pathname}${url.search}`;
}

function workflowError(error) {
  const message = String(error?.message ?? "");
  if (message.includes("stale_inquiry_status")) return "La demande a changé. Rechargez la page avant de réessayer.";
  if (message.includes("active_referral_blocks_closure")) return "Cette demande ne peut pas être clôturée avec une orientation active.";
  if (message.includes("closure_outcome_required")) return "Choisissez une raison de clôture.";
  if (message.includes("invalid_inquiry_status_transition")) return "Cette transition de statut n’est pas autorisée.";
  return "La modification n’a pas pu être enregistrée.";
}

function referralError(error) {
  const message = String(error?.message ?? "");
  if (message.includes("stale_referral_status")) return "L’orientation a changé. Rechargez la page avant de réessayer.";
  if (message.includes("active_referral_already_exists")) return "Cette destination possède déjà une orientation active.";
  if (message.includes("general_provider_sharing_permission_not_granted")) return "La permission générale de partage n’est pas accordée.";
  if (message.includes("referral_sharing_not_authorized")) return "Le partage n’est pas autorisé ou l’autorisation a été retirée.";
  if (message.includes("invalid_actual_shared_at")) return "La date de transmission doit être passée et postérieure à l’autorisation.";
  if (message.includes("invalid_provider_response_note")) return "La réponse doit contenir entre 1 et 1 000 caractères.";
  if (message.includes("not_eligible") || message.includes("care_offering")) return "La destination sélectionnée n’est plus admissible.";
  return "L’orientation n’a pas pu être mise à jour.";
}

function validUuid(value) { return UUID_PATTERN.test(String(value ?? "")); }

export async function createReferralAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const providerId = String(formData.get("providerId") ?? "") || null;
  const careOfferingId = String(formData.get("careOfferingId") ?? "") || null;
  if (!validUuid(inquiryId) || !validUuid(organizationId) || (providerId && !validUuid(providerId))
    || (careOfferingId && !validUuid(careOfferingId))) redirect("/lia/inquiries");
  await finishReferralAction(inquiryId, "create_internal_inquiry_referral", {
    p_inquiry_id: inquiryId, p_recipient_organization_id: organizationId,
    p_provider_id: providerId, p_care_offering_id: careOfferingId,
  }, "Orientation ajoutée à la présélection.");
}

export async function authorizeReferralSharingAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const referralId = String(formData.get("referralId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const basis = String(formData.get("authorizationBasis") ?? "");
  if (!validUuid(inquiryId) || !validUuid(referralId)
    || !["general_permission", "referral_specific_permission"].includes(basis)) redirect("/lia/inquiries");
  await finishReferralAction(inquiryId, "authorize_internal_referral_sharing", {
    p_referral_id: referralId, p_expected_status: expectedStatus, p_authorization_basis: basis,
  }, "Autorisation de partage enregistrée.");
}

export async function withdrawReferralAuthorizationAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const referralId = String(formData.get("referralId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  if (!validUuid(inquiryId) || !validUuid(referralId)) redirect("/lia/inquiries");
  await finishReferralAction(inquiryId, "withdraw_internal_referral_sharing_authorization", {
    p_referral_id: referralId, p_expected_status: expectedStatus,
  }, "Retrait de l’autorisation enregistré.");
}

export async function markReferralSharedAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const referralId = String(formData.get("referralId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const suppliedAt = String(formData.get("sharedAt") ?? "");
  const parsedAt = new Date(suppliedAt);
  if (!validUuid(inquiryId) || !validUuid(referralId) || !validUuid(idempotencyKey)
    || !suppliedAt || Number.isNaN(parsedAt.getTime())) redirect(detailUrl(inquiryId, "error", "Date de transmission invalide."));
  await finishReferralAction(inquiryId, "mark_internal_referral_shared", {
    p_referral_id: referralId, p_expected_status: expectedStatus,
    p_shared_at: parsedAt.toISOString(), p_idempotency_key: idempotencyKey,
  }, "Transmission manuelle enregistrée. Aucune donnée n’a été envoyée automatiquement.");
}

export async function recordReferralResponseAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const referralId = String(formData.get("referralId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const note = String(formData.get("responseNote") ?? "").trim();
  if (!validUuid(inquiryId) || !validUuid(referralId) || !note || note.length > 1000) {
    redirect(detailUrl(inquiryId, "error", "La réponse doit contenir entre 1 et 1 000 caractères."));
  }
  await finishReferralAction(inquiryId, "record_internal_referral_response", {
    p_referral_id: referralId, p_expected_status: expectedStatus, p_response_note: note,
  }, "Réponse du prestataire enregistrée.");
}

export async function transitionReferralAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const referralId = String(formData.get("referralId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const outcome = String(formData.get("outcomeCode") ?? "") || null;
  const validTransition = (expectedStatus === "shortlisted" && newStatus === "ready_to_share" && !outcome)
    || (newStatus === "closed" && REFERRAL_CLOSED_OUTCOMES.includes(outcome))
    || (expectedStatus === "engaged" && newStatus === "converted" && REFERRAL_SUCCESS_OUTCOMES.includes(outcome));
  if (!validUuid(inquiryId) || !validUuid(referralId) || !validTransition) redirect("/lia/inquiries");
  await finishReferralAction(inquiryId, "transition_internal_referral_status", {
    p_referral_id: referralId, p_expected_status: expectedStatus,
    p_new_status: newStatus, p_outcome_code: outcome,
  }, newStatus === "ready_to_share" ? "Orientation prête à transmettre." : "Résultat de l’orientation enregistré.");
}

export async function transitionInquiryAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const closureOutcome = String(formData.get("closureOutcome") ?? "") || null;
  if (!UUID_PATTERN.test(inquiryId) || !isInquiryStatus(expectedStatus) || !isInquiryStatus(newStatus)
    || (closureOutcome !== null && !isClosureOutcome(closureOutcome))) {
    redirect("/lia/inquiries");
  }
  const { error } = await supabase.rpc("transition_internal_inquiry_status", {
    p_inquiry_id: inquiryId,
    p_expected_status: expectedStatus,
    p_new_status: newStatus,
    p_closure_outcome_code: closureOutcome,
  });
  if (error) redirect(detailUrl(inquiryId, "error", workflowError(error)));
  revalidatePath("/lia/inquiries");
  revalidatePath(`/lia/inquiries/${inquiryId}`);
  redirect(detailUrl(inquiryId, "success", "Statut mis à jour."));
}

export async function addInternalNoteAction(formData) {
  await requireLiaStaff();
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const noteText = String(formData.get("noteText") ?? "").trim();
  if (!UUID_PATTERN.test(inquiryId)) redirect("/lia/inquiries");
  if (!noteText || noteText.length > 1000) {
    redirect(detailUrl(inquiryId, "error", "La note doit contenir entre 1 et 1 000 caractères."));
  }
  const { error } = await supabase.rpc("add_internal_inquiry_note", {
    p_inquiry_id: inquiryId,
    p_note_text: noteText,
  });
  if (error) redirect(detailUrl(inquiryId, "error", "La note n’a pas pu être enregistrée."));
  revalidatePath("/lia/inquiries");
  revalidatePath(`/lia/inquiries/${inquiryId}`);
  redirect(detailUrl(inquiryId, "success", "Note interne ajoutée."));
}

async function finishReferralAction(inquiryId, rpc, args, success) {
  const { error } = await supabase.rpc(rpc, args);
  if (error) redirect(detailUrl(inquiryId, "error", referralError(error)));
  revalidatePath("/lia/inquiries");
  revalidatePath(`/lia/inquiries/${inquiryId}`);
  redirect(detailUrl(inquiryId, "success", success));
}

export async function signOutStaffAction() {
  const staff = await requireLiaStaff();
  if (!staff) redirect("/lia/login");
  const { createLiaAuthClient } = await import("@/lib/lia-auth");
  const auth = await createLiaAuthClient();
  await auth.auth.signOut();
  redirect("/lia/login");
}
