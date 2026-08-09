"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Building2,
  House,
  Trees,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";

import {
  providers,
  searchProviders,
  COMMUNES,
  SPECIAL_FILTERS,
} from "../../lib/providers";

const PAGE_SIZE = 9;

const TABS = [
  {
    id: "ems",
    label: "EMS",
    description: "Établissements médico-sociaux",
    icon: Building2,
  },
  {
    id: "domicile",
    label: "Aide à domicile",
    description: "Soins et accompagnement à domicile",
    icon: House,
  },
  {
    id: "residence",
    label: "Résidences seniors",
    description: "Logements adaptés et résidences",
    icon: Trees,
  },
];

function typeLabel(type) {
  if (type === "ems") return "EMS";
  if (type === "domicile") return "Aide à domicile";
  return "Résidence senior";
}

export default function AnnuairePage() {
  const [activeTab, setActiveTab] = useState("ems");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState("Tous");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const requestedType = params.get("type");
  const requestedQuery = params.get("query");
  const requestedCommune = params.get("commune");

  if (["ems", "domicile", "residence"].includes(requestedType)) {
    setActiveTab(requestedType);
  }

  if (requestedQuery) {
    setSearchQuery(requestedQuery);
  }

  if (requestedCommune) {
    setActiveRegion(requestedCommune);
  }
}, []);
  const counts = useMemo(() => {
    return {
      ems: providers.filter((provider) => provider.type === "ems").length,
      domicile: providers.filter((provider) => provider.type === "domicile").length,
      residence: providers.filter((provider) => provider.type === "residence").length,
    };
  }, []);

  const filteredProviders = useMemo(() => {
    return searchProviders(searchQuery, activeTab, activeRegion);
  }, [searchQuery, activeTab, activeRegion]);

  const visibleProviders = filteredProviders.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, searchQuery, activeRegion]);

  function changeTab(tab) {
    setActiveTab(tab);
    setSearchQuery("");
    setActiveRegion("Tous");
  }

  return (
    <main className="min-h-screen bg-[#FFF8F3] text-[#10213D]">
      {/* HEADER */}
      <header className="border-b border-[#F2DDD9] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight text-[#10213D]">
              Lia
            </div>

            <span className="hidden rounded-full bg-[#FFF0EF] px-3 py-1 text-xs font-medium text-[#E64B60] sm:inline">
              Canton de Vaud
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[#566277] transition hover:text-[#FF5F72]"
          >
            <ArrowLeft size={16} />
            Retour à l’accueil
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-[#F2DDD9] bg-gradient-to-b from-white to-[#FFF8F3]">
        <div className="mx-auto max-w-5xl px-5 pb-12 pt-14 text-center md:px-8 md:pb-16 md:pt-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F2DDD9] bg-white px-4 py-2 text-sm text-[#566277]">
            <ShieldCheck size={16} className="text-[#FF5F72]" />
            Informations issues de sources publiques
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[#10213D] md:text-5xl">
            Explorez les solutions pour seniors dans le canton de Vaud
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#647084] md:text-lg">
            Recherchez un EMS, une aide à domicile ou une résidence senior selon
            la commune et les besoins de votre proche.
          </p>

          {/* SEARCH */}
          <div className="mx-auto mt-9 max-w-2xl">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8992A3]"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nom, commune, NPA ou besoin spécifique..."
                className="w-full rounded-2xl border border-[#E8DFDA] bg-white py-4 pl-12 pr-4 text-[15px] text-[#10213D] shadow-sm outline-none transition placeholder:text-[#9AA2AF] focus:border-[#FF7A87] focus:ring-4 focus:ring-[#FFF0EF]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY TABS */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    active
                      ? "border-[#FF7A87] bg-[#FFF0EF] shadow-sm"
                      : "border-[#ECE7E3] bg-white hover:border-[#FFC5CC] hover:bg-[#FFFAF7]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        active
                          ? "bg-white text-[#FF5F72]"
                          : "bg-[#FFF8F3] text-[#69758A]"
                      }`}
                    >
                      <Icon size={21} />
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        active
                          ? "bg-white text-[#E64B60]"
                          : "bg-[#F6F4F2] text-[#7E8797]"
                      }`}
                    >
                      {counts[tab.id]}
                    </span>
                  </div>

                  <div className="mt-4 font-semibold text-[#10213D]">
                    {tab.label}
                  </div>

                  <div className="mt-1 text-sm text-[#7A8495]">
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        {/* FILTERS */}
        <div className="mb-8 rounded-2xl border border-[#ECE7E3] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label
                htmlFor="region"
                className="mb-2 block text-sm font-semibold text-[#10213D]"
              >
                Commune
              </label>

              <select
                id="region"
                value={
                  COMMUNES.includes(activeRegion) ? activeRegion : "Tous"
                }
                onChange={(event) => setActiveRegion(event.target.value)}
                className="w-full rounded-xl border border-[#E4E0DD] bg-[#FFFDFC] px-4 py-3 text-sm text-[#3F4B60] outline-none focus:border-[#FF7A87]"
              >
                {COMMUNES.map((commune) => (
                  <option key={commune} value={commune}>
                    {commune}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {SPECIAL_FILTERS.map((filter) => {
                const active = activeRegion === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() =>
                      setActiveRegion(active ? "Tous" : filter)
                    }
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-[#10213D] bg-[#10213D] text-white"
                        : "border-[#E6E1DE] bg-white text-[#596579] hover:border-[#FFB5BE]"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-[#FF5F72]">
              {typeLabel(activeTab)}
            </div>

            <h2 className="mt-1 text-2xl font-semibold text-[#10213D]">
              {filteredProviders.length} résultat
              {filteredProviders.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {(searchQuery || activeRegion !== "Tous") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveRegion("Tous");
              }}
              className="text-sm font-medium text-[#69758A] underline decoration-[#FFC5CC] underline-offset-4 hover:text-[#FF5F72]"
            >
              Effacer les filtres
            </button>
          )}
        </div>

        {/* PROVIDERS */}
        {filteredProviders.length > 0 ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleProviders.map((provider) => (
                <article
                  key={provider.id}
                  className="flex min-h-[285px] flex-col rounded-2xl border border-[#ECE7E3] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FFD1D6] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl bg-[#FFF0EF] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#E64B60]">
                      {typeLabel(provider.type)}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#8590A1]">
                      <MapPin size={13} />
                      {provider.npa}
                    </div>
                  </div>

                  <h3 className="mt-5 text-lg font-semibold leading-snug text-[#10213D]">
                    {provider.name}
                  </h3>

                  <div className="mt-2 flex items-center gap-2 text-sm text-[#69758A]">
                    <MapPin size={15} className="text-[#FF7A87]" />
                    {provider.address}
                  </div>

                  {provider.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {provider.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#FFF8F3] px-3 py-1.5 text-xs text-[#657084]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    <div className="border-t border-[#F0ECE9] pt-5">
                      <p className="mb-4 text-xs leading-5 text-[#8992A3]">
                        Disponibilités, conditions et prestations à confirmer
                        auprès de l’organisme concerné.
                      </p>

                      <Link
                        href="/#form"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E64B60]"
                      >
                        Être accompagné par Lia
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* LOAD MORE */}
            {visibleCount < filteredProviders.length && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + PAGE_SIZE)
                  }
                  className="rounded-xl border border-[#DCD7D4] bg-white px-7 py-3.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#FFB5BE] hover:bg-[#FFFDFC]"
                >
                  Voir plus de résultats
                </button>

                <div className="mt-3 text-xs text-[#929AAA]">
                  {visibleProviders.length} sur {filteredProviders.length} affichés
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-[#ECE7E3] bg-white px-6 py-16 text-center">
            <Search size={34} className="mx-auto text-[#C5CAD2]" />

            <h3 className="mt-5 text-xl font-semibold text-[#10213D]">
              Aucun résultat trouvé
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A8495]">
              Essayez une autre commune, une autre catégorie ou un terme de
              recherche différent.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveRegion("Tous");
              }}
              className="mt-6 rounded-xl bg-[#10213D] px-5 py-3 text-sm font-semibold text-white"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}

        {/* HUMAN CTA */}
        <div className="mt-14 overflow-hidden rounded-3xl bg-[#10213D] px-6 py-9 text-white md:px-10 md:py-10">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#FF9EAA]">
                <HeartHandshake size={18} />
                Besoin d’aide pour choisir ?
              </div>

              <h2 className="text-2xl font-semibold md:text-3xl">
                Vous n’avez pas à comparer toutes les options seul.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                Décrivez-nous la situation de votre proche et Lia vous aide à
                identifier les solutions les plus pertinentes.
              </p>
            </div>

            <Link
              href="/#form"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#E64B60]"
            >
              Recevoir ma sélection
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* TRANSPARENCY */}
        <div className="mt-8 rounded-2xl border border-[#ECE7E3] bg-white p-5">
          <div className="flex gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-[#FF5F72]"
            />

            <div>
              <h3 className="text-sm font-semibold text-[#10213D]">
                À propos des informations affichées
              </h3>

              <p className="mt-1 text-xs leading-5 text-[#7A8495]">
                Lia rassemble des informations issues de sources publiques et
                des prestataires. Nous faisons notre possible pour les maintenir
                à jour, mais les services proposés, conditions et disponibilités
                doivent toujours être confirmés auprès de l’organisme concerné.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}