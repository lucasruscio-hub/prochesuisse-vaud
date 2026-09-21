import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, HeartHandshake, House, MapPin, Trees } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getProviderBySlug } from "../../../lib/provider-repository";
import { PROVIDER_TYPES } from "../../../lib/provider-config";
import { providerMetadata, providerBreadcrumbs } from "../../../lib/provider-detail";

export async function generateMetadata({ params }) {
  const provider = await getProviderBySlug((await params).slug);
  if (!provider) notFound();
  return providerMetadata(provider);
}

export default async function ProviderPage({ params }) {
  const provider = await getProviderBySlug((await params).slug);
  if (!provider) notFound();

  const Icon = provider.type === "ems" ? Building2 : provider.type === "domicile" ? House : Trees;
  const searchHref = `/recherche?type=${encodeURIComponent(provider.type)}`;
  const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10213D]";

  return (
    <div lang="fr" className="min-h-screen bg-[#FFF2EF] text-[#10213D]">
      <Header active="recherche" />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify(providerBreadcrumbs(provider)).replace(/</g, "\\u003c"),
        }} />
        <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
          <div className="mx-auto max-w-6xl px-5 py-5 md:px-8">
            <nav aria-label="Fil d’Ariane" className="text-sm leading-6 text-[#566277]">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <li><Link href="/" className={`hover:underline ${focus}`}>Accueil</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/recherche" className={`hover:underline ${focus}`}>Rechercher un prestataire</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="break-words">{provider.name}</li>
              </ol>
            </nav>
            <Link href={searchHref} className={`mt-3 inline-flex items-center gap-2 text-sm font-medium hover:underline ${focus}`}>
              <ArrowLeft size={16} aria-hidden="true" /> Retour à la recherche
            </Link>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl items-start gap-7 px-5 py-7 md:px-8 md:py-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="min-w-0 space-y-6">
            <header className="pb-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#9D3043]">
                <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                {PROVIDER_TYPES[provider.type]}
              </p>
              <h1 className="mt-3 break-words text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl">{provider.name}</h1>
              {(provider.address || provider.commune || provider.npa) && (
                <p className="mt-4 flex items-start gap-2 text-base leading-6 text-[#566277]">
                  <MapPin size={19} className="mt-0.5 shrink-0 text-[#9D3043]" aria-hidden="true" />
                  {provider.address || [provider.npa, provider.commune].filter(Boolean).join(" ")}
                </p>
              )}
            </header>
            <section aria-labelledby="details-heading" className="rounded-3xl border border-[#ECE2DF] bg-white p-6 sm:p-8">
              <h2 id="details-heading" className="text-xl font-semibold tracking-tight">En un coup d’œil</h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div><dt className="text-sm text-[#647084]">Type d’accompagnement</dt><dd className="mt-1 font-medium">{PROVIDER_TYPES[provider.type]}</dd></div>
                {provider.commune && <div><dt className="text-sm text-[#647084]">Localisation</dt><dd className="mt-1 font-medium">{provider.commune}</dd></div>}
                {provider.npa && <div><dt className="text-sm text-[#647084]">NPA</dt><dd className="mt-1 font-medium">{provider.npa}</dd></div>}
              </dl>
            </section>

            <section aria-labelledby="tags-heading" className="px-1 py-2">
              <h2 id="tags-heading" className="text-lg font-semibold">Informations à confirmer</h2>
              <p className="mt-3 text-sm leading-6 text-[#566277]">
                Lia vérifie progressivement les informations de ses fiches. Celles présentées ici{provider.tags.length > 0 ? ", y compris ces indications issues des sources existantes de Lia," : ""} n’ont pas encore été vérifiées de manière indépendante. Confirmez les éléments importants avant toute démarche.
                {provider.type === "domicile" && " La localisation ne définit pas la zone d’intervention."}
              </p>
              {provider.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {provider.tags.map((tag, index) => <li key={`${tag}-${index}`} className="rounded-full border border-[#E8DFDA] bg-white/60 px-3 py-1.5 text-xs text-[#566277]">{tag}</li>)}
                </ul>
              )}
            </section>
          </div>

          <aside aria-labelledby="enquiry-heading" className="rounded-3xl bg-[#10213D] p-7 text-white shadow-[0_12px_32px_rgba(16,33,61,0.12)] lg:sticky lg:top-8">
            <HeartHandshake size={30} strokeWidth={1.5} className="text-[#FF9EAA]" aria-hidden="true" />
            <h2 id="enquiry-heading" className="mt-5 text-2xl font-semibold leading-snug">Une recherche pour votre proche ?</h2>
            <p className="mt-4 text-sm leading-6 text-white/80">Partagez votre situation avec Lia pour préciser votre recherche.</p>
            <Link href="/#form" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-4 py-3.5 text-sm font-semibold text-[#10213D] transition hover:bg-[#FF8593] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Demander l’aide de Lia <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <p className="mt-4 text-xs leading-5 text-white/75">Vous contactez Lia, pas directement ce prestataire.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
