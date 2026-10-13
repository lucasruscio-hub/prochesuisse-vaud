"use client";

import { markReferralSharedAction } from "../actions";

export default function ReferralShareForm({ inquiryId, referralId, expectedStatus, idempotencyKey, enabled }) {
  function normalizeSharedAt(event) {
    const form = event.currentTarget;
    const localValue = form.elements.namedItem("sharedAtLocal")?.value;
    const isoField = form.elements.namedItem("sharedAt");
    if (localValue && isoField) isoField.value = new Date(localValue).toISOString();
  }

  return <form action={markReferralSharedAction} onSubmit={normalizeSharedAt} className="rounded-lg bg-amber-50 p-3">
    <input type="hidden" name="inquiryId" value={inquiryId} />
    <input type="hidden" name="referralId" value={referralId} />
    <input type="hidden" name="expectedStatus" value={expectedStatus} />
    <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    <input type="hidden" name="sharedAt" />
    <label className="block text-sm font-medium">Date et heure de la transmission réellement effectuée<input type="datetime-local" name="sharedAtLocal" required className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2" /></label>
    <p className="mt-2 text-xs text-amber-900">Cette action consigne une transmission manuelle déjà effectuée. Lia n’envoie aucune donnée.</p>
    <button disabled={!enabled} className="mt-3 w-full rounded-lg bg-amber-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Confirmer la transmission réelle</button>
  </form>;
}
