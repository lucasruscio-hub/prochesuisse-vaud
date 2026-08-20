import Link from "next/link";
import { ArrowRight, HeartHandshake, MailIcon, MapPin, ShieldCheck } from "lucide-react";

import Logo from "./Logo";

const footerSections = [
  {
    title: "Explorer",
    links: [
      ["EMS dans le canton de Vaud", "/recherche?type=ems"],
      ["Aide à domicile", "/recherche?type=domicile"],
      ["Résidences seniors", "/recherche?type=residence"],
      ["Spitex privé", "/recherche?type=domicile&filter=Spitex"],
      ["Court séjour / répit", "/recherche?type=ems&filter=Court%20s%C3%A9jour"],
      ["Alzheimer et démence", "/recherche?type=ems&filter=Alzheimer"],
    ],
  },
  {
    title: "Guides",
    links: [
      ["Financer les soins", "/guides/financer-soins-vaud"],
      ["EMS ou aide à domicile ?", "/guides"],
      ["Après une hospitalisation", "/guides"],
      ["Alzheimer et démence", "/guides"],
      ["Court séjour et répit", "/guides"],
      ["Tous les guides", "/guides"],
    ],
  },
  {
    title: "À propos de Lia",
    links: [
      ["Notre mission", "/notre-mission"],
      ["Notre indépendance", "/notre-independance"],
      ["Comment ça marche", "/notre-mission#comment-ca-marche"],
      ["Questions fréquentes", "/notre-mission#questions-frequentes"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Informations",
    links: [
      ["Mentions légales", "/mentions-legales"],
      ["Politique de confidentialité", "/politique-de-confidentialite"],
      ["Politique de cookies", "/politique-de-cookies"],
      ["Conditions d’utilisation", "/conditions-utilisation"],
    ],
  },
];

export default function Footer({ ctaHref = "/#form" }) {
  return (
    <footer id="contact" className="mt-16 border-t border-[#F1DDD7] bg-[#FFF8F3]">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
              Besoin d’y voir plus clair ?
            </p>

            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Vous n’avez pas à avancer seul.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Expliquez-nous la situation de votre proche. Lia vous aide à
              comprendre les options possibles et à identifier les prochaines
              étapes.
            </p>

            <Link
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-[#E64B60]"
            >
              Recevoir ma sélection
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-[2rem] border border-[#F1DDD7] bg-white p-7 shadow-lg shadow-rose-100/40 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
                <HeartHandshake size={27} strokeWidth={1.7} />
              </div>

              <div>
                <p className="text-sm text-slate-500">Une question ?</p>
                <h3 className="text-xl font-semibold text-[#10213D]">Contactez Lia</h3>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <a
                href="mailto:contact@liavaud.ch"
                className="flex items-center gap-4 rounded-2xl bg-[#FFF8F3] p-4 transition hover:bg-[#FFF0EF]"
              >
                <MailIcon size={21} strokeWidth={1.8} className="text-[#E64B60]" />

                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-semibold text-[#10213D]">contact@liavaud.ch</p>
                </div>
              </a>

              <div className="flex items-center gap-4 rounded-2xl bg-[#FFF8F3] p-4">
                <MapPin size={21} strokeWidth={1.8} className="text-[#E64B60]" />

                <div>
                  <p className="text-xs text-slate-500">Zone couverte actuellement</p>
                  <p className="font-semibold text-[#10213D]">Canton de Vaud</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="my-14 border-t border-[#EAD8D2]" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Logo />

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
              Une orientation humaine et indépendante pour aider les familles à
              trouver un accompagnement adapté à un proche âgé.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-[#F1DDD7]">
              <ShieldCheck size={16} strokeWidth={1.8} className="text-[#E64B60]" />
              Données confidentielles
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-[#10213D]">{section.title}</h3>

              <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600">
                {section.links.map(([label, href]) => (
                  <Link key={label} href={href} className="transition hover:text-[#E64B60]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#EAD8D2] bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 Lia - Tous droits réservés.</p>

          <p>
            Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un
            professionnel de santé.
          </p>
        </div>
      </div>
    </footer>
  );
}
