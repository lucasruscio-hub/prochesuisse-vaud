import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLiaStaff } from "@/lib/lia-auth";
import { getInternalInquiry } from "@/lib/internal-inquiries";
import {
  ACTIVITY_LABELS, CARE_TYPE_LABELS, CLOSURE_OUTCOME_LABELS, CLOSURE_OUTCOMES,
  NEED_LABELS, RELATIONSHIP_LABELS, STATUS_LABELS, TIMING_LABELS,
  allowedNextStatuses, formatLabel,
} from "@/lib/lia-inquiry-domain.mjs";
import { addInternalNoteAction, transitionInquiryAction } from "../actions";

export const dynamic = "force-dynamic";
const dateTime = new Intl.DateTimeFormat("fr-CH", { dateStyle: "medium", timeStyle: "short" });

function Field({ label, children }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-950">{children || "—"}</dd></div>;
}

export default async function InternalInquiryDetailPage({ params, searchParams }) {
  await requireLiaStaff();
  const { id } = await params;
  const query = await searchParams;
  const inquiry = await getInternalInquiry(id);
  if (!inquiry) notFound();
  const nextStatuses = allowedNextStatuses(inquiry.workflow_status);
  const sharingNotRecorded = inquiry.provider_sharing_permission_status === "not_recorded";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href="/lia/inquiries" className="text-sm font-semibold text-[#10213D] hover:underline">← Retour aux demandes</Link>
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-serif text-4xl text-[#10213D]">{inquiry.contact.first_name} {inquiry.contact.last_name}</h1>
          <p className="mt-2 text-sm text-slate-600">Soumise le {dateTime.format(new Date(inquiry.submitted_at))}</p>
        </div>
        <span className="self-start rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{formatLabel(STATUS_LABELS, inquiry.workflow_status)}</span>
      </div>
      {query?.error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{query.error}</p>}
      {query?.success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{query.success}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-[#10213D]">Contact</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="E-mail"><a className="underline" href={`mailto:${inquiry.contact.email}`}>{inquiry.contact.email}</a></Field>
              <Field label="Téléphone">{inquiry.contact.phone || "Non renseigné"}</Field>
              <Field label="Contact préféré">{inquiry.contact.preferred_contact_method === "phone" ? "Téléphone" : inquiry.contact.preferred_contact_method === "either" ? "E-mail ou téléphone" : "E-mail"}</Field>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-[#10213D]">Demande</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Type de prise en charge">{formatLabel(CARE_TYPE_LABELS, inquiry.care_type_code)}</Field>
              <Field label="Bénéficiaire">{formatLabel(RELATIONSHIP_LABELS, inquiry.beneficiary_relation_code)}</Field>
              <Field label="Délai">{formatLabel(TIMING_LABELS, inquiry.timing_code)}</Field>
              <Field label="Lieu">{[inquiry.location_text, inquiry.postal_code, inquiry.municipality?.official_name].filter(Boolean).join(" · ")}</Field>
              <Field label="Besoins"><span className="flex flex-wrap gap-2">{inquiry.need_codes.length ? inquiry.need_codes.map((code) => <span key={code} className="rounded-full bg-slate-100 px-2 py-1">{formatLabel(NEED_LABELS, code)}</span>) : "Aucun besoin sélectionné"}</span></Field>
              <Field label="Source">{[inquiry.source_channel, inquiry.source_detail, inquiry.landing_page].filter(Boolean).join(" · ")}</Field>
            </dl>
            {inquiry.context_summary && <div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contexte transmis</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{inquiry.context_summary}</p></div>}
          </section>

          <section className={`rounded-2xl border p-6 shadow-sm ${sharingNotRecorded ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <h2 className="font-serif text-2xl text-[#10213D]">Consentement et confidentialité</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Permission de contact">{inquiry.contact_permission_withdrawn_at ? "Retirée" : `Accordée le ${dateTime.format(new Date(inquiry.contact_permission_at))}`}</Field>
              <Field label="Information de confidentialité">{inquiry.privacy_notice_version} · {dateTime.format(new Date(inquiry.privacy_acknowledged_at))}</Field>
              <Field label="Partage avec des prestataires">{sharingNotRecorded ? "Non enregistré — aucun partage autorisé" : inquiry.provider_sharing_permission_status === "granted" ? "Autorisé" : "Autorisation retirée"}</Field>
            </dl>
            {sharingNotRecorded && <p className="mt-4 font-semibold text-amber-950">Lia ne peut pas transmettre les informations de cette famille à un prestataire.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-[#10213D]">Historique</h2>
            <ol className="mt-5 space-y-4">
              {inquiry.activities.map((activity) => (
                <li key={activity.id} className="border-l-2 border-slate-200 pl-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{formatLabel(ACTIVITY_LABELS, activity.activity_type)}</p><time className="text-xs text-slate-500">{dateTime.format(new Date(activity.occurred_at))}</time></div>
                  {activity.from_status && <p className="mt-1 text-sm text-slate-600">{formatLabel(STATUS_LABELS, activity.from_status)} → {formatLabel(STATUS_LABELS, activity.to_status)}</p>}
                  {activity.note_text && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{activity.note_text}</p>}
                  <p className="mt-1 text-xs text-slate-400">{activity.actor_type === "lia_staff" ? "Équipe Lia" : "Système"}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-[#10213D]">Prochaine étape</h2>
            {nextStatuses.length ? (
              <form action={transitionInquiryAction} className="mt-4 space-y-4">
                <input type="hidden" name="inquiryId" value={inquiry.id} />
                <input type="hidden" name="expectedStatus" value={inquiry.workflow_status} />
                <label className="block text-sm font-medium">Nouveau statut<select name="newStatus" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{nextStatuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
                <label className="block text-sm font-medium">Issue de clôture <span className="font-normal text-slate-500">(si clôturée)</span><select name="closureOutcome" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Choisir si nécessaire</option>{CLOSURE_OUTCOMES.map((value) => <option key={value} value={value}>{CLOSURE_OUTCOME_LABELS[value]}</option>)}</select></label>
                <button className="w-full rounded-lg bg-[#10213D] px-4 py-2.5 font-semibold text-white">Mettre à jour</button>
              </form>
            ) : <p className="mt-3 text-sm text-slate-600">Cette demande est clôturée.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-[#10213D]">Note interne</h2>
            <form action={addInternalNoteAction} className="mt-4">
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <textarea name="noteText" required maxLength={1000} rows={5} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Visible uniquement par l’équipe Lia." />
              <button className="mt-3 w-full rounded-lg border border-[#10213D] px-4 py-2.5 font-semibold text-[#10213D]">Ajouter la note</button>
            </form>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <h2 className="font-serif text-xl text-slate-700">Trouver des prestataires</h2>
            <p className="mt-2 text-sm text-slate-500">Disponible dans une prochaine phase. Aucune orientation ni transmission n’est créée ici.</p>
            <button disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">Bientôt disponible</button>
          </section>
        </aside>
      </div>
    </main>
  );
}
