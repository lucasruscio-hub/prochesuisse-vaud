import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
// Treat submitted values as text, never as email markup.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const requiredFields = [
      "need",
      "location",
      "urgency",
      "situation",
      "age",
      "funding",
      "firstName",
      "lastName",
      "email",
      "phone",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (body.consentContact !== true) {
      return NextResponse.json(
        { error: "Contact consent is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("leads").insert({
      need: body.need,
      location: body.location,
      urgency: body.urgency,
      situation: body.situation,
      needs: body.needs || [],
      age: body.age,
      funding: body.funding,
      details: body.details || null,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone,
      consent_contact: body.consentContact,
      // Keep the existing column compatible: its nullability/default is not documented.
      // Marketing is disabled at launch; ignore any marketing value sent by clients.
      consent_marketing: false,
      source: body.source || null,
      page: body.page || null,
      status: "new",
    });

    if (error) {
      console.error("Could not save lead to Supabase");
      return NextResponse.json(
        { error: "Could not save lead" },
        { status: 500 }
      );
    }
const emailResult = await resend.emails.send({
  from: "Lia <onboarding@resend.dev>",
  to: process.env.LEAD_NOTIFY_EMAIL,
  subject: `Nouveau lead Lia - ${body.need}`,
  html: `
    <h2>Nouveau lead Lia</h2>

    <p><strong>Besoin :</strong> ${escapeHtml(body.need)}</p>
    <p><strong>Localisation :</strong> ${escapeHtml(body.location)}</p>
    <p><strong>Urgence :</strong> ${escapeHtml(body.urgency)}</p>
    <p><strong>Situation :</strong> ${escapeHtml(body.situation)}</p>
    <p><strong>Âge :</strong> ${escapeHtml(body.age)}</p>
    <p><strong>Financement :</strong> ${escapeHtml(body.funding)}</p>

    <hr />

    <p><strong>Nom :</strong> ${escapeHtml(body.firstName)} ${escapeHtml(body.lastName)}</p>
    <p><strong>Email :</strong> ${escapeHtml(body.email)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(body.phone)}</p>

    ${
      body.details
        ? `<p><strong>Détails :</strong><br/>${escapeHtml(body.details)}</p>`
        : ""
    }
  `,
});
if (emailResult.error) {
  console.error("Lead saved, but notification delivery failed");
}
    return NextResponse.json({ success: true });
  } catch {
    console.error("Unexpected lead API failure");
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
