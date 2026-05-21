import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      consent_marketing: body.consentMarketing || false,
      source: body.source || null,
      page: body.page || null,
      status: "new",
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Could not save lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}