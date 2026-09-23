import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, Building2, HeartHandshake, House, MapPin, ShieldCheck, Trees } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import GoogleReviewCard from "../../components/GoogleReviewCard";
import { getProviderDetailBySlug } from "../../../lib/provider-repository";
import { providerMetadata, providerBreadcrumbs, providerDetailView, providerDetailSections, providerHeroMedia } from "../../../lib/provider-detail";

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

function GalleryPhoto({ photo, primary, google }) {
  return <figure className={`relative min-h-0 overflow-hidden bg-[#EDE5E0] ${primary ? "col-span-2 aspect-[4/3] sm:col-span-2 sm:row-span-3 sm:aspect-auto" : "aspect-square sm:aspect-auto"}`}>
    <Image src={photo.src} alt={photo.alt} fill sizes={primary ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 50vw, 33vw"} loading={primary ? "eager" : "lazy"} className="object-cover" unoptimized />
    {google && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/50 to-transparent px-3 pb-3 pt-9 text-[11px] leading-4 text-white/90" translate="no">
      <span className="sr-only">Photo Google Maps. </span>
      {photo.authors.map((author, index) => <span key={`${author.name}-${index}`} className="inline-flex items-center gap-1">{index > 0 && ", "}{author.photoUri && <Image src={author.photoUri} alt="" width={16} height={16} className="rounded-full" unoptimized />}{author.uri ? <a href={author.uri} target="_blank" rel="noopener noreferrer" className={`font-medium underline underline-offset-2 ${focus}`}>{author.name}</a> : author.name}</span>)}
      {photo.authors.length > 0 && " · "}<a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${focus}`}>Google Maps</a>
    </figcaption>}
  </figure>;
}

function PhotoHero({ photos, google }) {
  const selected = photos.slice(0, 4);
  const layout = selected.length === 1 ? "grid-cols-1 aspect-[16/10] sm:aspect-[16/8]"
    : selected.length === 2 ? "grid-cols-2 aspect-[16/10] sm:h-[500px] sm:aspect-auto"
      : "grid-cols-2 sm:h-[540px] sm:grid-cols-3 sm:grid-rows-3";
  return <section aria-label={google ? "Photos Google Maps" : "Photos du prestataire"} className="mt-5">
    {google && <div className="mb-2 flex items-center gap-2 text-xs text-[#657084]"><span>Photos fournies par</span><Image src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_92x30dp.png" alt="Google" width={55} height={18} unoptimized /></div>}
    <div className={`grid overflow-hidden rounded-[2rem] bg-[#293953] shadow-[0_24px_70px_rgba(16,33,61,0.13)] ${layout}`}>
      {selected.map((photo, index) => <GalleryPhoto key={photo.src} photo={photo} primary={index === 0 && selected.length > 2} google={google} />)}
    </div>
  </section>;
}

export async function generateMetadata({ params }) {
  const provider = await getProviderDetailBySlug((await params).slug, { includeGoogle: false });
  if (!provider) notFound();
  return providerMetadata(provider);
}

export default async function ProviderPage({ params }) {
  await connection();
  const provider = await getProviderDetailBySlug((await params).slug);
  if (!provider) notFound();
  const view = providerDetailView(provider);
  const Icon = view.type === "ems" ? Building2 : view.type === "domicile" ? House : Trees;
  const searchHref = `/recherche?type=${encodeURIComponent(view.type)}`;
  const hasReviews = (view.google?.reviews.length ?? 0) > 0 || view.google?.rating != null || view.reviews.lia.length > 0;
  const heroMedia = providerHeroMedia(view);
  const heroPhotos = heroMedia.photos;
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
        {heroPhotos.length > 0 ? <>
          <header className="mt-8 max-w-4xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#B34556]"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /> {view.typeLabel}</p>
            <h1 className="mt-4 break-words font-serif text-4xl leading-[1.08] tracking-tight text-[#10213D] sm:text-5xl lg:text-6xl">{view.name}</h1>
            {view.locationLabel && <p className="mt-4 flex items-start gap-2.5 text-base text-[#536176]"><MapPin size={19} className="mt-0.5 shrink-0 text-[#D45768]" aria-hidden="true" />{view.locationLabel}</p>}
          </header>
          <PhotoHero photos={heroPhotos} google={heroMedia.source === "google"} />
        </> : <header className="relative mt-6 overflow-hidden rounded-[2rem] bg-[#10213D] text-white shadow-[0_24px_70px_rgba(16,33,61,0.13)]">
          <div className="relative grid min-h-[330px] lg:grid-cols-[1.25fr_0.75fr]">
            <div className="relative z-10 flex flex-col justify-center px-7 py-10 sm:px-12 sm:py-14 lg:py-20">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC2C8]"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /> {view.typeLabel}</p>
              <h1 className="mt-5 max-w-3xl break-words font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{view.name}</h1>
              {view.locationLabel && <p className="mt-6 flex items-start gap-2.5 text-base text-white/85"><MapPin size={19} className="mt-0.5 shrink-0 text-[#FF9EAA]" aria-hidden="true" />{view.locationLabel}</p>}
            </div>
            <div className="relative hidden min-h-full overflow-hidden bg-[#293953] lg:block" aria-hidden="true"><div className="absolute -right-20 -top-24 h-[420px] w-[420px] rounded-full border-[70px] border-[#FF9EAA]/80" /><div className="absolute bottom-[-170px] left-[-60px] h-[420px] w-[420px] rounded-full border-[65px] border-[#F5D9CE]/20" /><div className="absolute bottom-12 right-14 h-20 w-20 rounded-full bg-[#FF9EAA]/30" /></div>
          </div>
        </header>}
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
            {(view.mapUrl || view.google?.embedUrl) && <Section id="localisation" eyebrow="Sur place" title="Localisation">
              {view.locationLabel && <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D5360]">Localisation indiquée par Lia</p><p className="mt-1 text-[#25364E]">{view.locationLabel}</p></div>}
              {view.google?.embedUrl && <div className="mt-5"><p className="text-xs text-[#69758A]">Carte fournie par Google Maps</p><iframe title={`Google Maps — ${view.name}`} src={view.google.embedUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="mt-2 aspect-[4/3] w-full rounded-2xl border border-[#EEE4DF] sm:aspect-[16/9]" allowFullScreen /></div>}
              <a href={view.google?.placeUrl ?? view.mapUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-2 font-semibold text-[#9D3043] underline underline-offset-4 ${focus}`}>Voir sur {view.google?.placeUrl ? "Google Maps" : "la carte"} <ArrowRight size={16} aria-hidden="true" /></a>
              {view.type === "domicile" && <p className="mt-3 text-sm">L’adresse d’un bureau ne définit pas la zone d’intervention.</p>}
            </Section>}
            {hasReviews && <Section id="avis" eyebrow="Retours d’expérience" title="Les avis">
              {view.google && (view.google.rating != null || view.google.reviews.length > 0) && <div className="rounded-2xl border border-[#EEE4DF] bg-white p-6">
                <h3 className="flex items-center gap-2 font-semibold text-[#10213D]">Avis <Image src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_92x30dp.png" alt="Google" width={62} height={20} unoptimized /></h3>
                {view.google.rating != null && <p className="mt-2 text-xl font-semibold text-[#10213D]">{view.google.rating.toLocaleString("fr-CH", { maximumFractionDigits: 1 })} / 5{view.google.reviewCount != null && <span className="ml-2 text-sm font-normal text-[#5D6979]">({view.google.reviewCount} avis sur Google)</span>}</p>}
                {view.google.reviews.length > 0 && <><p className="mt-2 text-xs">Google sélectionne les avis affichés selon leur pertinence. Ils ne sont pas des avis Lia et ne valident pas les prestations de soins.</p><div className="mt-4 grid items-start gap-3 sm:grid-cols-2">{view.google.reviews.map((review, index) => <GoogleReviewCard key={`${review.sourceUrl}-${index}`} review={review} />)}</div></>}
                {view.google.reviewsUrl && <a href={view.google.reviewsUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-block text-sm font-semibold text-[#9D3043] underline underline-offset-4 ${focus}`}>Voir les avis sur Google Maps</a>}
                {view.google.attributions.length > 0 && <p className="mt-3 text-xs" translate="no">Sources associées : {view.google.attributions.map((item, index) => <span key={`${item.name}-${index}`}>{index > 0 && ", "}{item.uri ? <a href={item.uri} target="_blank" rel="noopener noreferrer" className="underline">{item.name}</a> : item.name}</span>)}</p>}
              </div>}
              {view.reviews.lia.length > 0 && <div className="mt-7"><h3 className="font-semibold text-[#10213D]">Avis Lia</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{view.reviews.lia.map((review, index) => <blockquote key={`${review.author}-${index}`} className="rounded-2xl border border-[#EEE4DF] bg-white p-5"><p>“{review.quote}”</p><footer className="mt-3 text-sm font-medium text-[#10213D]">{review.author}{review.date && ` · ${review.date}`}</footer></blockquote>)}</div></div>}
            </Section>}
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
