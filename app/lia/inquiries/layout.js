import Link from "next/link";
import { requireLiaStaff } from "@/lib/lia-auth";
import { signOutStaffAction } from "./actions";

export default async function InternalInquiryLayout({ children }) {
  const staff = await requireLiaStaff();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/lia/inquiries" className="font-serif text-2xl text-[#10213D]">Lia interne</Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="hidden sm:inline">{staff.email}</span>
            <form action={signOutStaffAction}>
              <button className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
