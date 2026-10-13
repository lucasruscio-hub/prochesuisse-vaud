import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeStaffUser } from "@/lib/lia-staff-auth-core.mjs";

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export async function createLiaAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (updates) => {
          try {
            updates.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies. Route handlers and actions refresh them.
          }
        },
      },
    },
  );
}

export async function getLiaStaffUser() {
  const auth = await createLiaAuthClient();
  return authorizeStaffUser(() => auth.auth.getUser(), process.env.LIA_STAFF_EMAILS);
}

export async function requireLiaStaff() {
  const staff = await getLiaStaffUser();
  if (!staff) redirect("/lia/login");
  return staff;
}
