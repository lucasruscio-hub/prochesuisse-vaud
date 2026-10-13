import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getLiaStaffUser } from "@/lib/lia-auth";

export const metadata = { title: "Connexion interne | Lia" };
export const dynamic = "force-dynamic";

export default async function LiaLoginPage({ searchParams }) {
  const staff = await getLiaStaffUser();
  if (staff) redirect("/lia/inquiries");
  const query = await searchParams;
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF5F72]">Lia interne</p>
        <h1 className="mt-3 font-serif text-3xl text-[#10213D]">Connexion de l’équipe</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Accès réservé aux comptes Lia préalablement provisionnés et autorisés.
        </p>
        {query?.error && (
          <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Ce lien n’est pas valide ou ce compte n’est pas autorisé.
          </p>
        )}
        <LoginForm />
      </section>
    </main>
  );
}
