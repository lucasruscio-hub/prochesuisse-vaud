"use client";

import { useActionState } from "react";
import { requestStaffMagicLink } from "./actions";

const initialState = { submitted: false, message: "" };

export default function LoginForm() {
  const [state, action, pending] = useActionState(requestStaffMagicLink, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[#10213D]">
          Adresse e-mail professionnelle
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-[#FF5F72]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#10213D] px-4 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Recevoir un lien de connexion"}
      </button>
      {state.submitted && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.message}
        </p>
      )}
    </form>
  );
}
