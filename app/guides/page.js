import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { guides } from "../../lib/guides";

export const metadata = {
  title: "Guides Lia | Comprendre les solutions de soins dans le canton de Vaud",
  description:
    "Guides pratiques Lia pour aider les familles à comprendre les EMS, l’aide à domicile, le financement et les solutions de répit dans le canton de Vaud.",
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-[#FFF2EF] text-[#10213D]">
      <Header active="guides" />

      <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
        <div className="mx-auto max-w-5xl px-5 py-14 text-center md:px-8 md:py-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-[#E64B60] shadow-sm">
            <BookOpen size={16} />
            Guides Lia
          </div>

          <h1 className="font-serif text-[40px] font-semibold leading-[1.1] tracking-tight text-[#10213D] sm:text-5xl md:text-[58px]">
            Comprendre les options avant de choisir
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5D687A]">
            Des repères clairs pour financer, comparer et organiser un
            accompagnement adapté à un proche âgé dans le canton de Vaud.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group rounded-3xl border border-[#F0D4D6] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#FFB9C1] hover:shadow-xl hover:shadow-rose-100/50"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#E64B60]">
                {guide.category}
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#10213D]">
                {guide.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#5D687A]">
                {guide.metaDescription}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#E64B60]">
                Lire le guide
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
