"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLiaStaff } from "@/lib/lia-auth";
import { supabase } from "@/lib/supabase";
import { isClosureOutcome, isInquiryStatus } from "@/lib/lia-inquiry-domain.mjs";

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

export async function signOutStaffAction() {
  const staff = await requireLiaStaff();
  if (!staff) redirect("/lia/login");
  const { createLiaAuthClient } = await import("@/lib/lia-auth");
  const auth = await createLiaAuthClient();
  await auth.auth.signOut();
  redirect("/lia/login");
}
