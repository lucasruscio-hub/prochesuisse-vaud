import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, HeartHandshake, House, MapPin, ShieldCheck, Trees } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getProviderDetailBySlug } from "../../../lib/provider-repository";
import { providerMetadata, providerBreadcrumbs, providerDetailView, providerDetailSections } from "../../../lib/provider-detail";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10213D]";

function Section({ id, eyebrow, title, children }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 border-t border-[#E8E1DC] py-9 sm:py-11">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B34556]">{eyebrow}</p>
    <h2 id={`${id}-heading`} className="mt-2 font-serif text-2xl leading-tight sm:text-3xl">{title}</h2>
    <div className="mt-5 text-[15px] leading-7 text-[#4E5B6D]">{children}</div>
  </section>;
}

function Assistance({ compact = false }) {
  return <div className={compact ? "flex items-center gap-4" : ""}>
    {!compact && <HeartHandshake size={30} strokeWidth={1.5} className="text-[#FF9EAA]" aria-hidden="true" />}
    <div className={compact ? "min-w-0 flex-1" : ""}>
      <h2 className={compact ? "text-sm font-semibold" : "mt-5 font-serif text-2xl leading-snug"}>Un choix à faire pour un proche&nbsp;?</h2>
      {!compact && <p className="mt-3 text-sm leading-6 text-white/80">Lia vous aide à clarifier les options et les prochaines étapes, à votre rythme.</p>}
    </div>
    <Link href="/#form" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF8E9D] px-5 py-3 text-sm font-semibold text-[#10213D] transition hover:bg-[#FFB0BA] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${compact ? "shrink-0" : "mt-6 w-full"}`}>
      Parler à Lia <ArrowRight size={17} aria-hidden="true" />
    </Link>
    {!compact && <p className="mt-4 text-xs leading-5 text-white/70">Vous contactez Lia, pas directement ce prestataire.</p>}
  </div>;
}

function List({ values }) {
  return <ul className="grid gap-2 sm:grid-cols-2">{values.map((value) => <li key={value} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E86C7C]" aria-hidden="true" />{value}</li>)}</ul>;
}

export async function generateMetadata({ params }) {
  const provider = await getProviderDetailBySlug((await params).slug);
  if (!provider) notFound();
  return providerMetadata(provider);
}

export default async function ProviderPage({ params }) {
  const provider = await getProviderDetailBySlug((await params).slug);
  if (!provider) notFound();
  const view = providerDetailView(provider);
  const Icon = view.type === "ems" ? Building2 : view.type === "domicile" ? House : Trees;
  const searchHref = `/recherche?type=${encodeURIComponent(view.type)}`;
  const hasReviews = view.reviews.google.length > 0 || view.reviews.lia.length > 0;
  const navigation = providerDetailSections(view);

  return <div lang="fr" className="min-h-screen bg-[#FFFAF7] text-[#10213D]">
    <Header active="recherche" />
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(providerBreadcrumbs(provider)).replace(/</g, "\\u003c") }} />
      <div className="border-b border-[#EEE7E3] bg-white">
        <nav aria-label="Fil d’Ariane" className="mx-auto max-w-7xl px-5 py-4 text-sm text-[#657084] md:px-8">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li><Link href="/" className={`hover:underline ${focus}`}>Accueil</Link></li><li aria-hidden="true">/</li>
            <li><Link href="/recherche" className={`hover:underline ${focus}`}>Prestataires</Link></li><li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-full truncate text-[#10213D]">{view.name}</li>
          </ol>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-5 pt-7 md:px-8 md:pt-9">
        <Link href={searchHref} className={`inline-flex items-center gap-2 text-sm font-medium text-[#5D6979] hover:text-[#B34556] ${focus}`}><ArrowLeft size={16} aria-hidden="true" /> Retour aux résultats</Link>
        <header className="relative mt-6 overflow-hidden rounded-[2rem] bg-[#10213D] text-white shadow-[0_24px_70px_rgba(16,33,61,0.13)]">
          <div className="relative grid min-h-[330px] lg:grid-cols-[1.25fr_0.75fr]">
            <div className="relative z-10 flex flex-col justify-center px-7 py-10 sm:px-12 sm:py-14 lg:py-20">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC2C8]"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /> {view.typeLabel}</p>
              <h1 className="mt-5 max-w-3xl break-words font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{view.name}</h1>
              {view.locationLabel && <p className="mt-6 flex items-start gap-2.5 text-base text-white/85"><MapPin size={19} className="mt-0.5 shrink-0 text-[#FF9EAA]" aria-hidden="true" />{view.locationLabel}</p>}
            </div>
            {view.photos.length ? <div className="relative min-h-64 overflow-hidden bg-[#F2E1DC] lg:min-h-full"><Image src={view.photos[0].src} alt={view.photos[0].alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" unoptimized /></div>
              : <div className="relative hidden min-h-full overflow-hidden bg-[#293953] lg:block" aria-hidden="true"><div className="absolute -right-20 -top-24 h-[420px] w-[420px] rounded-full border-[70px] border-[#FF9EAA]/80" /><div className="absolute bottom-[-170px] left-[-60px] h-[420px] w-[420px] rounded-full border-[65px] border-[#F5D9CE]/20" /><div className="absolute bottom-12 right-14 h-20 w-20 rounded-full bg-[#FF9EAA]/30" /></div>}
          </div>
        </header>
        {view.photos.length > 1 && <div aria-label="Photos du prestataire" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{view.photos.slice(1).map((photo) => <div key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#F2E1DC]"><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" unoptimized /></div>)}</div>}
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <nav aria-label="Sur cette fiche" className="mt-7 flex flex-wrap gap-2 border-b border-[#E8E1DC] pb-6 text-sm">{navigation.map(([id, label]) => <a key={id} href={`#${id}`} className={`rounded-full border border-[#E8E1DC] bg-white px-4 py-2 font-medium text-[#48566A] transition hover:border-[#FF9EAA] hover:text-[#9D3043] ${focus}`}>{label}</a>)}</nav>
        <div className="grid items-start gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-16">
          <div className="min-w-0">
            <Section id="reperes" eyebrow="L’essentiel" title="Informations principales">
              {view.overview && <p className="mb-7 max-w-2xl text-lg leading-8 text-[#25364E]">{view.overview}</p>}
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#EEE4DF] bg-white p-5"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">Type</dt><dd className="mt-2 font-medium text-[#10213D]">{view.typeLabel}</dd></div>
                {view.locality && <div className="rounded-2xl border border-[#EEE4DF] bg-white p-5"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">Localisation indiquée</dt><dd className="mt-2 font-medium text-[#10213D]">{view.locality}</dd></div>}
                {view.facts.map((fact) => <div key={`${fact.label}-${fact.value}`} className="rounded-2xl border border-[#EEE4DF] bg-white p-5"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">{fact.label}</dt><dd className="mt-2 font-medium text-[#10213D]">{fact.value}</dd></div>)}
              </dl>
            </Section>
            {(view.contact.phone || view.contact.email || view.contact.website) && <Section id="contact" eyebrow="Pour joindre le prestataire" title="Coordonnées">
              <dl className="grid gap-3 sm:grid-cols-2">
                {view.contact.phone && <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">Téléphone</dt><dd><a className={`font-medium text-[#10213D] underline underline-offset-4 ${focus}`} href={`tel:${view.contact.phone.replace(/[^+\d]/g, "")}`}>{view.contact.phone}</a></dd></div>}
                {view.contact.email && <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">E-mail</dt><dd className="break-all"><a className={`font-medium text-[#10213D] underline underline-offset-4 ${focus}`} href={`mailto:${view.contact.email}`}>{view.contact.email}</a></dd></div>}
                {view.contact.website && <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">Site web</dt><dd><a className={`inline-flex items-center gap-2 font-medium text-[#10213D] underline underline-offset-4 ${focus}`} href={view.contact.website} target="_blank" rel="noopener noreferrer">Voir le site du prestataire <ArrowRight size={16} aria-hidden="true" /></a></dd></div>}
              </dl>
            </Section>}
            {view.offerings.length > 0 && <Section id="accompagnement" eyebrow="Offres de soins et de vie" title="Les accompagnements proposés"><div className="space-y-4">{view.offerings.map((offering, index) => <article key={`${offering.name}-${index}`} className="rounded-2xl border border-[#EEE4DF] bg-white p-6 sm:p-7">
              <h3 className="font-serif text-xl text-[#10213D]">{offering.name}</h3>{offering.summary && <p className="mt-2">{offering.summary}</p>}
              {[["Soins et services", offering.services], ["Hébergement", offering.accommodation], ["Équipements et espaces", offering.facilities]].filter(([, values]) => values.length).map(([label, values]) => <div key={label} className="mt-5"><h4 className="mb-2 font-semibold text-[#10213D]">{label}</h4><List values={values} /></div>)}
            </article>)}</div></Section>}
            {(view.admissions || view.pricing || view.availability) && <Section id="pratique" eyebrow="Pour avancer" title="Informations pratiques"><div className="grid gap-4 sm:grid-cols-2">{[["Admissions et accès", view.admissions], ["Tarifs et financement", view.pricing], ["Disponibilités", view.availability?.text]].filter(([, value]) => value).map(([title, value]) => <div key={title} className="rounded-2xl border border-[#EEE4DF] bg-white p-6"><h3 className="font-semibold text-[#10213D]">{title}</h3><p className="mt-2">{value}</p>{title === "Disponibilités" && <p className="mt-2 text-xs text-[#69758A]">Mise à jour&nbsp;: {view.availability.checkedAt}</p>}</div>)}</div></Section>}
            {view.mapUrl && <Section id="localisation" eyebrow="Sur place" title="Localisation">{view.locationLabel && <p>{view.locationLabel}</p>}<a href={view.mapUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-2 font-semibold text-[#9D3043] underline underline-offset-4 ${focus}`}>Voir la carte <ArrowRight size={16} aria-hidden="true" /></a>{view.type === "domicile" && <p className="mt-3 text-sm">L’adresse d’un bureau ne définit pas la zone d’intervention.</p>}</Section>}
            {hasReviews && <Section id="avis" eyebrow="Retours d’expérience" title="Les avis"><div className="space-y-7">{[["google", "Avis Google"], ["lia", "Avis Lia"]].filter(([source]) => view.reviews[source].length).map(([source, label]) => <div key={source}><h3 className="font-semibold text-[#10213D]">{label}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{view.reviews[source].map((review, index) => <blockquote key={`${review.author}-${index}`} className="rounded-2xl border border-[#EEE4DF] bg-white p-5"><p>“{review.quote}”</p><footer className="mt-3 text-sm font-medium text-[#10213D]">{review.author}{review.date && ` · ${review.date}`}</footer></blockquote>)}</div></div>)}</div></Section>}
            {view.operator && <Section id="organisation" eyebrow="À propos" title="L’organisation"><p className="font-semibold text-[#10213D]">{view.operator.name}</p>{view.operator.description && <p className="mt-2">{view.operator.description}</p>}</Section>}
            <section id="sources" aria-labelledby="sources-heading" className="scroll-mt-24 border-t border-[#E8E1DC] py-8 text-sm leading-6 text-[#5D6979]">
              <h2 id="sources-heading" className="font-semibold text-[#354359]">À propos des informations</h2>
              {view.sourceFreshness ? <p className="flex items-start gap-2"><ShieldCheck size={19} className="mt-1 shrink-0 text-[#40836B]" aria-hidden="true" />{view.sourceFreshness.label}{view.sourceFreshness.date && ` · ${view.sourceFreshness.date}`}</p> : <p>Les informations de cet annuaire restent à confirmer auprès du prestataire avant toute démarche. Lia enrichit progressivement ses fiches.</p>}
              {view.type === "domicile" && <p className="mt-3">La localisation indiquée ne permet pas de déduire une zone d’intervention.</p>}
              {view.legacyTags.length > 0 && <div className="mt-6 rounded-2xl bg-[#FFF0EC] p-5"><h3 className="text-sm font-semibold text-[#7F3845]">Mots-clés historiques, non vérifiés</h3><p className="mt-2 text-sm">Ils proviennent de l’ancien annuaire et ne constituent pas une liste de services confirmés.</p><p className="mt-3 text-sm text-[#7F3845]">{view.legacyTags.join(" · ")}</p></div>}
            </section>
          </div>
          <aside aria-label="Aide Lia" className="hidden rounded-3xl bg-[#10213D] p-7 text-white shadow-[0_16px_40px_rgba(16,33,61,0.13)] lg:sticky lg:top-8 lg:mt-10 lg:block"><Assistance /></aside>
        </div>
      </div>
      <aside aria-label="Aide Lia" className="sticky bottom-0 z-20 border-t border-white/10 bg-[#10213D] px-5 py-3 text-white shadow-[0_-12px_32px_rgba(16,33,61,0.15)] lg:hidden"><div className="mx-auto max-w-7xl"><Assistance compact /></div></aside>
    </main>
    <Footer />
  </div>;
}
