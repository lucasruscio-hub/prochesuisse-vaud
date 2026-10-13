"use server";

import { createLiaAuthClient } from "@/lib/lia-auth";
import {
  GENERIC_LOGIN_MESSAGE,
  buildStaffOtpRequest,
  isAllowlistedStaffEmail,
  normalizeStaffEmail,
} from "@/lib/lia-staff-auth-core.mjs";

export async function requestStaffMagicLink(_previousState, formData) {
  const email = normalizeStaffEmail(formData.get("email"));
  const response = { submitted: true, message: GENERIC_LOGIN_MESSAGE };
  if (!email || !isAllowlistedStaffEmail(email, process.env.LIA_STAFF_EMAILS)) return response;

  try {
    const auth = await createLiaAuthClient();
    const request = buildStaffOtpRequest(email, process.env.LIA_APP_ORIGIN);
    const { error } = await auth.auth.signInWithOtp(request);
    if (error) console.error("Lia staff magic-link request failed", error.code ?? "unknown");
  } catch (error) {
    console.error("Lia staff authentication is unavailable", error instanceof Error ? error.message : "unknown");
  }
  return response;
}
