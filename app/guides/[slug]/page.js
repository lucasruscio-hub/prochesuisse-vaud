import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import {
  getAllGuideSlugs,
  getGuideBySlug,
} from "../../../lib/guides";
import Footer from "../../components/Footer";
import Header from "../../components/Header";

const SITE_URL = "https://liavaud.ch";

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide introuvable | Lia",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = `${SITE_URL}/guides/${guide.slug}`;

  return {
    title: guide.seoTitle,
    description: guide.metaDescription,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: guide.seoTitle,
      description: guide.metaDescription,
      url: canonicalUrl,
      siteName: "Lia",
      locale: "fr_CH",
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: guide.seoTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const canonicalUrl = `${SITE_URL}/guides/${guide.slug}`;

  const structuredData = {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: guide.title,
        description: guide.metaDescription,
        mainEntityOfPage: canonicalUrl,
        inLanguage: "fr-CH",

        author: {
          "@type": "Organization",
          name: "Lia",
          url: SITE_URL,
        },

        publisher: {
          "@type": "Organization",
          name: "Lia",
          url: SITE_URL,
        },
      },

      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,

        mainEntity: guide.faq.map((item) => ({
          "@type": "Question",
          name: item.question,

          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },

      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,

        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guides",
            item: `${SITE_URL}/guides`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#FFF2EF] text-[#10213D]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <Header active="guides" />

      {/* HERO */}
      <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
        <div className="mx-auto max-w-5xl px-5 pb-14 pt-10 md:px-8 md:pb-16 md:pt-14">
          {/* BREADCRUMB */}
          <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[#6F7889]">
            <Link
              href="/"
              className="transition hover:text-[#E64B60]"
            >
              Accueil
            </Link>

            <span>/</span>

            <Link
              href="/guides"
              className="transition hover:text-[#E64B60]"
            >
              Guides
            </Link>

            <span>/</span>

            <span className="text-[#10213D]">
              {guide.category}
            </span>
          </div>

          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-[#E64B60] shadow-sm">
              <BookOpen size={16} />
              Guide Lia · {guide.category}
            </div>

            <h1 className="font-serif text-[40px] font-semibold leading-[1.1] tracking-tight text-[#10213D] sm:text-5xl md:text-[58px]">
              {guide.title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#657084]">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-[#FF5F72]" />
                {guide.readingTime} de lecture
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays
                  size={16}
                  className="text-[#FF5F72]"
                />
                Vérifié le {guide.lastReviewed}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE AREA */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          {/* TABLE OF CONTENTS */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-[#ECE2DE] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10213D]">
                Dans ce guide
              </p>

              <nav className="mt-4 space-y-1">
                {guide.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-3 py-2 text-sm leading-5 text-[#687386] transition hover:bg-[#FFF2EF] hover:text-[#E64B60]"
                  >
                    {section.title}
                  </a>
                ))}

                <a
                  href="#questions"
                  className="block rounded-lg px-3 py-2 text-sm leading-5 text-[#687386] transition hover:bg-[#FFF2EF] hover:text-[#E64B60]"
                >
                  Questions fréquentes
                </a>

                <a
                  href="#sources"
                  className="block rounded-lg px-3 py-2 text-sm leading-5 text-[#687386] transition hover:bg-[#FFF2EF] hover:text-[#E64B60]"
                >
                  Sources
                </a>
              </nav>
            </div>
          </aside>

          {/* CONTENT */}
          <article className="min-w-0">
            {/* ANSWER-FIRST BOX */}
            <section className="rounded-3xl border border-[#F0D4D6] bg-white p-6 shadow-sm md:p-8">
              <div className="flex gap-4">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0EF] text-[#FF5F72] sm:flex">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#E64B60]">
                    Réponse courte
                  </p>

                  <h2 className="mt-2 text-xl font-semibold leading-snug text-[#10213D] md:text-2xl">
                    {guide.question}
                  </h2>

                  <p className="mt-4 text-[16px] leading-8 text-[#4F5C70]">
                    {guide.shortAnswer}
                  </p>
                </div>
              </div>
            </section>

            {/* KEY POINTS */}
            <section className="mt-8 rounded-3xl bg-[#10213D] p-6 text-white md:p-8">
              <h2 className="text-xl font-semibold md:text-2xl">
                À retenir
              </h2>

              <div className="mt-5 space-y-4">
                {guide.keyPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF5F72]">
                      <Check size={14} strokeWidth={3} />
                    </div>

                    <p className="text-sm leading-6 text-white/85 md:text-[15px]">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* MAIN SECTIONS */}
            <div className="mt-12 space-y-12">
              {guide.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-8"
                >
                  <h2 className="font-serif text-3xl font-semibold leading-tight text-[#10213D] md:text-[36px]">
                    {section.title}
                  </h2>

                  <div className="mt-5 space-y-5">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[16px] leading-8 text-[#566277] md:text-[17px]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* CTA */}
            <section className="mt-14 overflow-hidden rounded-3xl bg-[#FDE7EA] p-7 md:p-9">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#E64B60]">
                  Accompagnement Lia
                </p>

                <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#10213D] md:text-4xl">
                  {guide.cta.title}
                </h2>

                <p className="mt-4 text-[16px] leading-7 text-[#5D687A]">
                  {guide.cta.text}
                </p>

                <Link
                  href={guide.cta.href}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#E64B60]"
                >
                  {guide.cta.button}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>

            {/* FAQ */}
            <section
              id="questions"
              className="mt-14 scroll-mt-8"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#E64B60]">
                Questions fréquentes
              </p>

              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#10213D] md:text-4xl">
                Les questions que se posent les familles
              </h2>

              <div className="mt-7 space-y-4">
                {guide.faq.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-2xl border border-[#E9E1DD] bg-white px-5 py-1 shadow-sm"
                  >
                    <summary className="cursor-pointer list-none py-5 font-semibold leading-6 text-[#10213D]">
                      <div className="flex items-center justify-between gap-5">
                        <span>{item.question}</span>

                        <span className="text-xl font-normal text-[#FF5F72] transition group-open:rotate-45">
                          +
                        </span>
                      </div>
                    </summary>

                    <p className="border-t border-[#F0E9E5] pb-5 pt-4 text-[15px] leading-7 text-[#657084]">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            {/* SOURCES */}
            <section
              id="sources"
              className="mt-14 scroll-mt-8 rounded-3xl border border-[#E9E1DD] bg-white p-6 md:p-8"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={21}
                  className="mt-1 shrink-0 text-[#FF5F72]"
                />

                <div>
                  <h2 className="text-xl font-semibold text-[#10213D]">
                    Sources et vérification
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69758A]">
                    Ce guide s’appuie prioritairement sur des
                    informations officielles suisses et vaudoises.
                    Les règles, montants et conditions peuvent évoluer.
                    Vérifiez toujours votre situation auprès de
                    l’organisme compétent.
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {guide.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm leading-6 text-[#566277] underline decoration-[#F5C4C9] underline-offset-4 transition hover:text-[#E64B60]"
                    >
                      <ExternalLink
                        size={14}
                        className="mt-1 shrink-0"
                      />

                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-[#F0E9E5] pt-5 text-xs leading-5 text-[#8992A3]">
                Dernière vérification : {guide.lastReviewed}. Le
                contenu de Lia est informatif et ne remplace pas un
                conseil juridique, médical ou administratif
                personnalisé.
              </p>
            </section>

            {/* BACK TO GUIDES */}
            <div className="mt-10">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#10213D] transition hover:text-[#E64B60]"
              >
                <ArrowLeft size={16} />
                Voir tous les guides
              </Link>
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
