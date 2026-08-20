import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  HeartHandshake,
  Search,
  ShieldCheck,
} from "lucide-react";

import Footer from "../components/Footer";
import Header from "../components/Header";

export const metadata = {
  title: "Notre mission | Lia",
  description:
    "La mission de Lia : rendre les décisions de soins plus simples, plus claires et plus humaines pour les familles dans le canton de Vaud.",
};

const actions = [
  {
    title: "Explorer les solutions",
    text: "Rechercher des EMS, des services d’aide à domicile et des résidences seniors selon la région et les besoins.",
    href: "/recherche",
    Icon: Search,
  },
  {
    title: "Mieux comprendre",
    text: "Accéder à des guides clairs sur le financement, les démarches, les séjours temporaires et les différentes formes d’accompagnement.",
    href: "/guides",
    Icon: BookOpen,
  },
  {
    title: "Être accompagné",
    text: "Décrire la situation de son proche et recevoir une aide pour identifier les pistes les plus pertinentes.",
    href: "/#form",
    Icon: HeartHandshake,
  },
];

const principles = [
  {
    title: "Clarté",
    text: "Présenter les informations de manière compréhensible, sans rendre une situation déjà difficile encore plus compliquée.",
  },
  {
    title: "Humanité",
    text: "Ne jamais oublier que derrière chaque recherche se trouve une famille qui essaie de prendre une décision importante.",
  },
  {
    title: "Transparence",
    text: "Ne pas présenter comme vérifiés des prix, disponibilités, partenariats ou informations qui ne le sont pas. Lorsque quelque chose doit être confirmé auprès d’un organisme, Lia le dit clairement.",
  },
];

export default function MissionPage() {
  return (
    <main className="min-h-screen bg-[#FFF8F3] text-[#10213D]">
      <Header />

      <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
              À propos de Lia
            </p>

            <h1 className="mt-5 max-w-4xl font-serif text-[42px] font-semibold leading-[1.08] text-[#10213D] sm:text-5xl lg:text-[64px]">
              Rendre les décisions de soins plus simples pour les familles
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#40506A] sm:text-lg">
              Lorsqu’un proche âgé a besoin d’aide, les familles doivent
              souvent comprendre rapidement des solutions qu’elles connaissent
              peu. Lia a été créée pour rendre cette recherche plus claire,
              plus humaine et plus simple.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/recherche"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10213D] px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#19345C]"
              >
                Explorer les solutions
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/notre-independance"
                className="inline-flex items-center justify-center rounded-full border border-[#F1C8C9] bg-white px-7 py-4 text-sm font-bold text-[#10213D] transition hover:-translate-y-0.5 hover:border-[#FF9EAA] hover:text-[#E64B60]"
              >
                Notre indépendance
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/75 p-7 shadow-xl shadow-rose-100/60 backdrop-blur">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
              <Compass size={28} strokeWidth={1.7} />
            </div>

            <h2 className="mt-6 font-serif text-3xl font-semibold leading-tight text-[#10213D]">
              Un point de départ clair dans un moment souvent chargé
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Lia commence par le canton de Vaud pour proposer une expérience
              locale, lisible et utile aux familles qui doivent comparer des
              options concrètes.
            </p>

            <div className="mt-6 rounded-2xl bg-[#FFF8F3] p-5 text-xs leading-6 text-slate-500">
              Les informations affichées sur Lia sont indicatives et doivent
              être confirmées auprès des organismes concernés lorsqu’elles
              peuvent évoluer.
            </div>
          </div>
        </div>
      </section>

      <section id="pourquoi" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
              Pourquoi Lia existe
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Pourquoi Lia existe
            </h2>
          </div>

          <div className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm md:p-9">
            <div className="space-y-5 text-base leading-8 text-[#566277]">
              <p>
                Trouver un EMS, organiser une aide à domicile ou comprendre
                les différentes possibilités d’accompagnement peut devenir
                complexe, surtout lorsqu’une décision doit être prise
                rapidement. Les informations sont dispersées, les démarches
                varient et il n’est pas toujours évident de savoir par où
                commencer.
              </p>

              <p>
                Lia rassemble les solutions et les informations utiles dans un
                même espace afin d’aider les familles à mieux comprendre leurs
                options et à avancer avec davantage de clarté.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="border-y border-[#F3E3DE] bg-[#FFF9F6]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
              Ce que Lia fait
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Trois façons d’avancer avec plus de repères
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {actions.map(({ title, text, href, Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex min-h-[280px] flex-col rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#FFB9C1] hover:shadow-xl hover:shadow-rose-100/60"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0EF] text-[#E64B60]">
                  <Icon size={25} strokeWidth={1.7} />
                </div>

                <h3 className="mt-6 text-xl font-semibold text-[#10213D]">
                  {title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>

                <div className="mt-auto pt-7 text-sm font-semibold text-[#E64B60]">
                  En savoir plus
                  <ArrowRight
                    size={15}
                    className="ml-2 inline transition group-hover:translate-x-1"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="principes" className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
            Nos principes
          </p>

          <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
            Une plateforme pensée pour des décisions importantes
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#10213D] text-white">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </div>

              <h3 className="font-serif text-3xl font-semibold text-[#10213D]">
                {principle.title}
              </h3>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {principle.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-4 md:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-[#10213D] p-8 text-white shadow-xl shadow-slate-200/70 md:p-12 lg:p-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF9EAA]">
              Notre ambition
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Aujourd’hui dans le canton de Vaud. Demain, dans d’autres régions
              de Suisse.
            </h2>

            <p className="mt-6 text-base leading-8 text-white/75">
              Lia commence dans le canton de Vaud afin de construire une
              expérience utile et fiable à l’échelle locale. Notre ambition est
              ensuite d’étendre progressivement la plateforme à d’autres régions
              de Suisse et de faciliter partout l’accès aux solutions pour les
              personnes âgées et leurs familles.
            </p>
          </div>
        </div>
      </section>

      <section id="limites" className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
              Transparence
            </p>

            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
              Ce que Lia n’est pas
            </h2>
          </div>

          <div className="rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm md:p-9">
            <p className="text-base leading-8 text-[#566277]">
              Lia n’est pas un prestataire médical, un EMS, un service social
              ou une autorité publique. Les informations publiées ont vocation
              à aider les familles à s’orienter et doivent être confirmées
              auprès des organismes concernés lorsqu’elles peuvent évoluer.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/notre-independance"
                className="rounded-full border border-[#F1C8C9] px-5 py-3 text-sm font-semibold text-[#10213D] transition hover:border-[#FF9EAA] hover:text-[#E64B60]"
              >
                Notre indépendance
              </Link>

              <Link
                href="/guides"
                className="rounded-full border border-[#F1C8C9] px-5 py-3 text-sm font-semibold text-[#10213D] transition hover:border-[#FF9EAA] hover:text-[#E64B60]"
              >
                Lire les guides
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
