import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Handshake,
  Search,
  ShieldCheck,
} from "lucide-react";

import Footer from "../components/Footer";
import Header from "../components/Header";

export const metadata = {
  title: "Notre indépendance | Transparence Lia",
  description:
    "Comment Lia présente les informations, les prestataires et les relations commerciales possibles avec transparence pour les familles.",
};

const listingSources = [
  {
    title: "Sources publiques",
    text: "Certains établissements et services peuvent être référencés à partir d’informations publiques afin d’aider les familles à comprendre les solutions disponibles dans leur région.",
    Icon: FileText,
  },
  {
    title: "Informations des prestataires",
    text: "Lorsque des informations sont communiquées directement par un organisme, elles peuvent compléter ou mettre à jour les informations disponibles.",
    Icon: BadgeCheck,
  },
  {
    title: "Partenariats",
    text: "La présence d’un organisme sur Lia ne signifie pas automatiquement qu’il existe un partenariat commercial avec lui.",
    Icon: Handshake,
  },
];

const commitments = [
  {
    title: "Inventer des disponibilités",
    text: "Une place disponible doit être confirmée par l’organisme concerné.",
  },
  {
    title: "Inventer des tarifs",
    text: "Les prix et conditions susceptibles d’évoluer doivent être confirmés.",
  },
  {
    title: "Présenter un organisme comme partenaire lorsqu’il ne l’est pas",
    text: "La présence sur Lia et le partenariat sont deux choses différentes.",
  },
  {
    title: "Masquer une information commerciale importante",
    text: "Lorsque cela est nécessaire pour comprendre la relation entre Lia et un prestataire, elle doit être expliquée clairement.",
  },
];

export default function IndependencePage() {
  return (
    <main className="min-h-screen bg-[#FFF8F3] text-[#10213D]">
      <Header />

      <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
              Transparence
            </p>

            <h1 className="mt-5 max-w-4xl font-serif text-[42px] font-semibold leading-[1.08] text-[#10213D] sm:text-5xl lg:text-[64px]">
              Vous devez savoir comment Lia fonctionne
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#40506A] sm:text-lg">
              Lorsqu’une famille cherche une solution pour un proche, elle doit
              pouvoir comprendre d’où viennent les informations affichées, ce
              qui a été vérifié et si une relation commerciale existe avec un
              prestataire.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-7 shadow-xl shadow-rose-100/60 backdrop-blur">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
              <ShieldCheck size={28} strokeWidth={1.7} />
            </div>

            <h2 className="mt-6 font-serif text-3xl font-semibold leading-tight text-[#10213D]">
              La présence sur Lia ne signifie pas partenariat
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Un organisme peut apparaître dans les résultats de recherche sans
              être partenaire de Lia. Les informations disponibles peuvent
              notamment provenir de sources publiques.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
              Notre principe
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              La transparence avant tout
            </h2>
          </div>

          <div className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm md:p-9">
            <div className="space-y-5 text-base leading-8 text-[#566277]">
              <p>
                Lia souhaite aider les familles à comparer plus facilement les
                solutions disponibles. Pour être utile, la plateforme doit
                distinguer clairement les informations publiques, les
                informations communiquées par les prestataires et les
                éventuelles relations commerciales.
              </p>

              <p>
                Lorsqu’une information comme une disponibilité, un tarif ou une
                prestation doit être confirmée directement auprès d’un
                organisme, Lia l’indique.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#F3E3DE] bg-[#FFF9F6]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Comment les établissements apparaissent sur Lia
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {listingSources.map(({ title, text, Icon }) => (
              <article
                key={title}
                className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0EF] text-[#E64B60]">
                  <Icon size={25} strokeWidth={1.7} />
                </div>

                <h3 className="mt-6 text-xl font-semibold text-[#10213D]">
                  {title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
              Modèle économique
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Et si Lia est rémunérée ?
            </h2>
          </div>

          <div>
            <div className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm md:p-9">
              <div className="space-y-5 text-base leading-8 text-[#566277]">
                <p>
                  Lia pourra conclure des partenariats avec certains
                  prestataires et être rémunérée dans le cadre de certaines
                  mises en relation. Lorsqu’une relation commerciale est
                  pertinente pour comprendre une recommandation ou une
                  présentation, notre objectif est qu’elle soit identifiable
                  clairement.
                </p>

                <p>
                  Une relation commerciale ne doit pas transformer une
                  information non vérifiée en information vérifiée, ni permettre
                  de présenter une disponibilité, un tarif ou une qualité de
                  service comme certaine lorsqu’elle ne l’est pas.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[2rem] bg-[#10213D] p-6 text-white">
              <p className="text-lg font-semibold leading-7">
                Être partenaire ne signifie pas automatiquement être mieux
                adapté à une famille.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#F3E3DE] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Nos règles de transparence
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {commitments.map((commitment) => (
              <article
                key={commitment.title}
                className="rounded-[2rem] border border-[#F0DED8] bg-[#FFF8F3] p-6"
              >
                <div className="flex gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5F72] text-white">
                    <ShieldCheck size={16} strokeWidth={2.1} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[#10213D]">
                      {commitment.title}
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {commitment.text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm md:p-9">
            <h2 className="font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Comment choisir avec Lia
            </h2>

            <div className="mt-6 space-y-5 text-base leading-8 text-[#566277]">
              <p>
                L’objectif n’est pas de dire aux familles qu’il existe une seule
                bonne réponse. Le besoin de soins, la localisation, le type
                d’accompagnement, les préférences personnelles et les
                possibilités financières peuvent tous compter dans une décision.
              </p>

              <p>
                Lia aide à organiser ces informations et à identifier des
                pistes. La décision finale appartient toujours à la personne
                concernée et à sa famille, avec les professionnels compétents
                lorsque cela est nécessaire.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/recherche"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10213D] px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#19345C]"
              >
                Explorer les solutions
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/notre-mission"
                className="inline-flex items-center justify-center rounded-full border border-[#F1C8C9] bg-white px-7 py-4 text-sm font-bold text-[#10213D] transition hover:-translate-y-0.5 hover:border-[#FF9EAA] hover:text-[#E64B60]"
              >
                Comprendre notre mission
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#FFF0EF] p-7 md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#E64B60]">
              <Search size={27} strokeWidth={1.7} />
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-700">
              Les filtres, les guides et l’accompagnement Lia sont pensés comme
              des repères pour mieux structurer une recherche, pas comme une
              décision automatique à la place de la famille.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-4 md:px-8">
        <div className="rounded-[2.5rem] bg-[#10213D] p-8 text-white shadow-xl shadow-slate-200/70 md:p-12 lg:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF9EAA]">
            Une plateforme qui évolue
          </p>

          <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            À mesure que Lia grandira, cette transparence devra rester simple.
          </h2>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/75">
            Les services, partenariats et fonctionnalités de Lia évolueront.
            Cette page a vocation à expliquer de manière claire comment la
            plateforme fonctionne et pourra être mise à jour lorsque notre
            modèle évolue.
          </p>

          <p className="mt-7 rounded-2xl bg-white/10 p-5 text-sm leading-7 text-white/85">
            Si vous avez une question sur le fonctionnement de Lia :
            contact@liavaud.ch
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
