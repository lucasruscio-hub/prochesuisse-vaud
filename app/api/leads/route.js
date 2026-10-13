import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MAX_INTAKE_BODY_BYTES, processLegacyLead } from "@/lib/inquiry-intake.mjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function optionalLine(label, value) {
  return value ? `<p><strong>${label} :</strong> ${escapeHtml(value)}</p>` : "";
}

async function sendNotification(intake) {
  return resend.emails.send({
    from: "Lia <onboarding@resend.dev>",
    to: process.env.LEAD_NOTIFY_EMAIL,
    subject: `Nouvelle demande Lia - ${intake.careType}`,
    html: `
      <h2>Nouvelle demande Lia</h2>
      <p><strong>Besoin :</strong> ${escapeHtml(intake.careType)}</p>
      <p><strong>Localisation :</strong> ${escapeHtml(intake.location)}</p>
      <p><strong>Délai :</strong> ${escapeHtml(intake.timing)}</p>
      ${optionalLine("Besoins sélectionnés", intake.needCodes.join(", "))}
      <hr />
      <p><strong>Nom :</strong> ${escapeHtml(intake.firstName)} ${escapeHtml(intake.lastName)}</p>
      <p><strong>Email :</strong> ${escapeHtml(intake.email)}</p>
      ${optionalLine("Téléphone", intake.phone)}
      ${intake.contextSummary
        ? `<p><strong>Contexte :</strong><br/>${escapeHtml(intake.contextSummary)}</p>`
        : ""}
    `,
  });
}

export async function POST(request) {
  try {
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_INTAKE_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }

    const result = await processLegacyLead({
      rawBody: await request.text(),
      idempotencyKey: request.headers.get("idempotency-key"),
      createInquiry: (args) => supabase.rpc("create_inquiry_from_public_intake", args),
      sendNotification,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    console.error("Unexpected inquiry intake failure");
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
