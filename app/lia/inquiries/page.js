import Link from "next/link";
import { requireLiaStaff } from "@/lib/lia-auth";
import { listInternalInquiries } from "@/lib/internal-inquiries";
import {
  CARE_TYPE_LABELS, INQUIRY_STATUSES, STATUS_LABELS, TIMING_LABELS, formatLabel, isInquiryStatus,
} from "@/lib/lia-inquiry-domain.mjs";

export const metadata = { title: "Demandes internes | Lia" };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("fr-CH", { dateStyle: "short", timeStyle: "short" });

export default async function InternalInquiriesPage({ searchParams }) {
  await requireLiaStaff();
  const query = await searchParams;
  const status = isInquiryStatus(query?.status) ? query.status : "";
  const inquiries = await listInternalInquiries(status);
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF5F72]">Opérations Lia</p>
          <h1 className="mt-2 font-serif text-4xl text-[#10213D]">Demandes des familles</h1>
          <p className="mt-2 text-sm text-slate-600">Les demandes actives sont présentées avant les demandes clôturées.</p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <label className="text-sm font-medium text-slate-700">
            Statut
            <select name="status" defaultValue={status} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Tous</option>
              {INQUIRY_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-[#10213D] px-4 py-2 text-sm font-semibold text-white">Filtrer</button>
        </form>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {inquiries.length === 0 ? (
          <p className="p-8 text-sm text-slate-600">Aucune demande pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>{["Soumise", "Contact", "Besoin", "Lieu", "Délai", "Statut", "Dernière activité"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">{dateTime.format(new Date(item.submittedAt))}</td>
                    <td className="px-4 py-4 font-semibold text-[#10213D]"><Link href={`/lia/inquiries/${item.id}`} className="hover:underline">{item.contactName}</Link></td>
                    <td className="px-4 py-4">{formatLabel(CARE_TYPE_LABELS, item.careType)}</td>
                    <td className="px-4 py-4">{item.location}</td>
                    <td className="px-4 py-4">{formatLabel(TIMING_LABELS, item.timing)}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{formatLabel(STATUS_LABELS, item.workflowStatus)}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{dateTime.format(new Date(item.lastActivityAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
