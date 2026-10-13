export const GENERIC_LOGIN_MESSAGE =
  "Si cette adresse est autorisée, un lien de connexion va être envoyé.";

export function normalizeStaffEmail(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "";
  return normalized;
}

export function parseStaffEmailAllowlist(value) {
  if (typeof value !== "string") return new Set();
  return new Set(value.split(",").map(normalizeStaffEmail).filter(Boolean));
}

export function isAllowlistedStaffEmail(email, allowlist = process.env.LIA_STAFF_EMAILS) {
  const normalized = normalizeStaffEmail(email);
  return Boolean(normalized && parseStaffEmailAllowlist(allowlist).has(normalized));
}

export function buildStaffOtpRequest(email, origin) {
  const normalizedEmail = normalizeStaffEmail(email);
  const applicationOrigin = new URL(origin);
  if (!normalizedEmail || !["http:", "https:"].includes(applicationOrigin.protocol)) {
    throw new Error("Invalid staff authentication configuration");
  }
  if (applicationOrigin.protocol !== "https:"
    && !["localhost", "127.0.0.1"].includes(applicationOrigin.hostname)) {
    throw new Error("Staff authentication origin must use HTTPS");
  }
  return {
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: new URL("/lia/auth/callback", applicationOrigin).toString(),
    },
  };
}

export async function authorizeStaffUser(getUser, allowlist) {
  const result = await getUser();
  const user = result?.data?.user ?? null;
  const email = normalizeStaffEmail(user?.email);
  if (result?.error || !user || !isAllowlistedStaffEmail(email, allowlist)) return null;
  return { id: user.id, email };
}
