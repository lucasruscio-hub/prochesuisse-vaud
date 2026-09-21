"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Building2,
  House,
  Trees,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  X,
} from "lucide-react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { SPECIAL_FILTERS } from "../../lib/provider-config";
import { providerPath } from "../../lib/provider-detail";
import { searchProviders } from "../../lib/provider-search";

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

function resultsHeading(type, count) {
  if (type === "ems") {
    return `${count} EMS présent${count !== 1 ? "s" : ""} sur Lia`;
  }

  if (type === "domicile") {
    return `${count} service${count !== 1 ? "s" : ""} d’aide à domicile présent${
      count !== 1 ? "s" : ""
    } sur Lia`;
  }

  return `${count} résidence${count !== 1 ? "s" : ""} senior${
    count !== 1 ? "s" : ""
  } présente${count !== 1 ? "s" : ""} sur Lia`;
}

function ProviderIcon({ type }) {
  const Icon = type === "ems" ? Building2 : type === "domicile" ? House : Trees;

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0EF] text-[#E64B60]">
      <Icon size={22} strokeWidth={1.8} />
    </div>
  );
}

export default function RechercheClient({ providers }) {
  const [activeTab, setActiveTab] = useState("ems");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCommune, setActiveCommune] = useState("Tous");
  const [activeSpecial, setActiveSpecial] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const communeOptions = useMemo(() => {
    const uniqueCommunes = Array.from(
      new Set(providers.map((provider) => provider.commune))
    ).sort((a, b) => a.localeCompare(b, "fr"));

    return ["Tous", ...uniqueCommunes];
  }, [providers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const requestedType = params.get("type");
    const requestedQuery = params.get("query");
    const requestedCommune = params.get("commune");
    const requestedFilter = params.get("filter");

    if (["ems", "domicile", "residence"].includes(requestedType)) {
      setActiveTab(requestedType);
    }

    if (requestedQuery) {
      setSearchQuery(requestedQuery);
    }

    if (requestedCommune && communeOptions.includes(requestedCommune)) {
      setActiveCommune(requestedCommune);
    }

    if (requestedFilter && SPECIAL_FILTERS.includes(requestedFilter)) {
      setActiveSpecial(requestedFilter);
    }
  }, [communeOptions]);

  const counts = useMemo(() => {
    return {
      ems: providers.filter((provider) => provider.type === "ems").length,
      domicile: providers.filter((provider) => provider.type === "domicile")
        .length,
      residence: providers.filter((provider) => provider.type === "residence")
        .length,
    };
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const baseResults = searchProviders(
      providers,
      searchQuery,
      activeTab,
      activeCommune
    );

    if (!activeSpecial) return baseResults;

    const special = activeSpecial.toLowerCase();

    return baseResults.filter((provider) =>
      provider.tags.some((tag) => tag.toLowerCase().includes(special))
    );
  }, [providers, searchQuery, activeTab, activeCommune, activeSpecial]);

  const visibleProviders = filteredProviders.slice(0, visibleCount);

  const hasFilters = Boolean(
    searchQuery.trim() || activeCommune !== "Tous" || activeSpecial
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, searchQuery, activeCommune, activeSpecial]);

  function clearFilters() {
    setSearchQuery("");
    setActiveCommune("Tous");
    setActiveSpecial("");
  }

  return (
    <main className="min-h-screen bg-[#FFF2EF] text-[#10213D]">
      <Header active="recherche" />

      {/* HERO */}
      <section className="border-b border-[#F2DDD9] bg-[#FDE7EA]">
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-11 text-center md:px-8 md:pb-12 md:pt-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F2DDD9] bg-white px-4 py-2 text-sm text-[#566277] shadow-sm">
            <ShieldCheck size={16} className="text-[#FF5F72]" />
            Informations issues de sources publiques
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[#10213D] md:text-[46px]">
            Trouvez une solution adaptée à votre proche dans le canton de Vaud
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#647084] md:text-lg">
            Explorez les EMS, services d’aide à domicile et résidences seniors
            selon la commune et les besoins de votre proche.
          </p>

          <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-[#E8DFDA] bg-white p-2 shadow-[0_12px_35px_rgba(23,35,58,0.07)]">
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
                className="w-full rounded-xl border-0 bg-[#FFFDFC] py-4 pl-12 pr-11 text-[15px] text-[#10213D] outline-none transition placeholder:text-[#9AA2AF] focus:bg-white focus:ring-2 focus:ring-[#FFD6DA]"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#8992A3] transition hover:bg-[#FFF0EF] hover:text-[#E64B60]"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY TABS */}
      <section className="border-b border-[#F1EAE6] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group rounded-2xl border p-5 text-left transition duration-200 ${
                    active
                      ? "border-[#FF8C98] bg-[#FFF0EF] shadow-sm"
                      : "border-[#ECE7E3] bg-white hover:-translate-y-0.5 hover:border-[#FFC5CC] hover:bg-[#FFFCFA] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-white text-[#FF5F72] shadow-sm"
                          : "bg-[#FFF8F3] text-[#69758A] group-hover:text-[#E64B60]"
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

                  <div className="mt-1 text-sm leading-5 text-[#7A8495]">
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        {/* FILTERS */}
        <div className="rounded-2xl border border-[#ECE7E3] bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-end lg:gap-8">
            <div>
              <label
                htmlFor="commune"
                className="mb-2 block text-sm font-semibold text-[#10213D]"
              >
                Commune
              </label>

              <select
                id="commune"
                value={activeCommune}
                onChange={(event) =>
                  setActiveCommune(event.target.value)
                }
                className="w-full rounded-xl border border-[#E4E0DD] bg-[#FFFDFC] px-4 py-3 text-sm text-[#3F4B60] outline-none transition focus:border-[#FF7A87] focus:ring-4 focus:ring-[#FFF0EF]"
              >
                {communeOptions.map((commune) => (
                  <option key={commune} value={commune}>
                    {commune === "Tous"
                      ? "Toutes les communes"
                      : commune}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-[#10213D]">
                Besoins spécifiques
              </div>

              <div className="flex flex-wrap gap-2">
                {SPECIAL_FILTERS.map((filter) => {
                  const active = activeSpecial === filter;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() =>
                        setActiveSpecial(active ? "" : filter)
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-[#10213D] bg-[#10213D] text-white"
                          : "border-[#E6E1DE] bg-white text-[#596579] hover:border-[#FFB5BE] hover:bg-[#FFF8F3]"
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="mb-6 mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#E64B60]">
              {typeLabel(activeTab)}
            </div>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#10213D] md:text-[28px]">
              {resultsHeading(
                activeTab,
                filteredProviders.length
              )}
            </h2>

            {hasFilters && filteredProviders.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-[#7A8495]">
                {activeCommune !== "Tous" && (
                  <span>{activeCommune}</span>
                )}

                {activeCommune !== "Tous" && activeSpecial && (
                  <span>·</span>
                )}

                {activeSpecial && <span>{activeSpecial}</span>}

                {(activeCommune !== "Tous" || activeSpecial) &&
                  searchQuery.trim() && <span>·</span>}

                {searchQuery.trim() && (
                  <span>“{searchQuery.trim()}”</span>
                )}
              </div>
            )}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-[#69758A] underline decoration-[#FFC5CC] underline-offset-4 transition hover:text-[#FF5F72]"
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
                <Link
                  href={providerPath(provider.slug)}
                  aria-label={`Voir la fiche de ${provider.name}`}
                  key={provider.id}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10213D] flex min-h-[300px] flex-col rounded-2xl border border-[#ECE7E3] bg-white p-6 shadow-[0_5px_20px_rgba(23,35,58,0.035)] transition duration-200 hover:-translate-y-1 hover:border-[#FFD1D6] hover:shadow-[0_16px_35px_rgba(23,35,58,0.08)]"
                >
                  <div className="flex items-start gap-4">
                    <ProviderIcon type={provider.type} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#E64B60]">
                          {typeLabel(provider.type)}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#8A94A4]">
                          <MapPin size={13} />
                          {provider.npa}
                        </div>
                      </div>

                      <h3 className="mt-2 text-lg font-semibold leading-snug text-[#10213D]">
                        {provider.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2 text-sm text-[#69758A]">
                    <MapPin
                      size={15}
                      className="mt-0.5 shrink-0 text-[#FF7A87]"
                    />

                    <span>{provider.address}</span>
                  </div>

                  {provider.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {provider.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#F1E8E4] bg-[#FFF8F3] px-3 py-1.5 text-xs font-medium text-[#657084]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    <div className="border-t border-[#F0ECE9] pt-5">
                      <p className="mb-4 text-xs leading-5 text-[#8992A3]">
                        Prestations, conditions et disponibilités à
                        confirmer auprès de l’organisme concerné.
                      </p>

                      <span
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10213D] px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-[#19345C]"
                      >
                        Voir la fiche
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* LOAD MORE */}
            {visibleCount < filteredProviders.length && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount(
                      (current) => current + PAGE_SIZE
                    )
                  }
                  className="rounded-xl border border-[#DCD7D4] bg-white px-7 py-3.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#FFB5BE] hover:bg-[#FFFDFC]"
                >
                  Voir plus de résultats
                </button>

                <div className="mt-3 text-xs text-[#929AAA]">
                  {visibleProviders.length} sur{" "}
                  {filteredProviders.length} affichés
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-[#ECE7E3] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8F3]">
              <Search size={25} className="text-[#B3BAC5]" />
            </div>

            <h3 className="mt-5 text-xl font-semibold text-[#10213D]">
              Aucun résultat avec ces critères
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A8495]">
              Essayez une autre commune, retirez un filtre ou
              élargissez votre recherche. Lia peut aussi vous aider
              à identifier d’autres pistes.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl bg-[#10213D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19345C]"
              >
                Réinitialiser la recherche
              </button>

              <Link
                href="/#form"
                className="rounded-xl border border-[#E6E1DE] bg-white px-5 py-3 text-sm font-semibold text-[#10213D] transition hover:border-[#FFB5BE] hover:bg-[#FFF8F3]"
              >
                Demander l’aide de Lia
              </Link>
            </div>
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
                Décrivez-nous la situation de votre proche. Lia vous
                aide à identifier les solutions les plus pertinentes
                dans le canton de Vaud.
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
                Lia rassemble des informations issues de sources
                publiques et des prestataires. Nous faisons notre
                possible pour les maintenir à jour, mais les services
                proposés, conditions et disponibilités doivent toujours
                être confirmés auprès de l’organisme concerné.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
