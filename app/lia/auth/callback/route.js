import { NextResponse } from "next/server";
import { createLiaAuthClient } from "@/lib/lia-auth";
import { authorizeStaffUser } from "@/lib/lia-staff-auth-core.mjs";

export async function GET(request) {
  let applicationOrigin;
  try {
    applicationOrigin = new URL(process.env.LIA_APP_ORIGIN);
  } catch {
    return NextResponse.json({ error: "Staff authentication unavailable" }, { status: 503 });
  }
  const loginUrl = new URL("/lia/login", applicationOrigin);
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    loginUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(loginUrl);
  }
  try {
    const auth = await createLiaAuthClient();
    const { error } = await auth.auth.exchangeCodeForSession(code);
    if (!error) {
      const staff = await authorizeStaffUser(
        () => auth.auth.getUser(), process.env.LIA_STAFF_EMAILS,
      );
      if (staff) return NextResponse.redirect(new URL("/lia/inquiries", applicationOrigin));
    }
    await auth.auth.signOut();
  } catch {
    // The public response is deliberately generic.
  }
  loginUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(loginUrl);
}
